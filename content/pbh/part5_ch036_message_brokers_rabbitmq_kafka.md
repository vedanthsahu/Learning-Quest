## 36. Message Brokers: RabbitMQ & Kafka

### 36.1 The Problem: §22.3's `BackgroundTasks` Isn't Reliable Enough for Work That Must Happen

§22.3 established that `BackgroundTasks` runs in-process and is silently lost if the process crashes before the task completes — an acceptable tradeoff for best-effort work, unacceptable for anything that must reliably happen (a payment confirmation, an inventory adjustment). A **message broker** solves this by persisting a message durably, independent of any single process's lifetime, so that work can be picked up and completed by any available worker, at any time, even across restarts and crashes.

### 36.2 Engineering Constraint: A Broker Decouples "Something Happened" From "Something Must Process It"

A message broker sits between **producers** (code that emits an event or a unit of work — a booking was created) and **consumers** (workers that process it — send a confirmation email) — the producer doesn't need to know how many consumers exist, whether they're currently available, or how long processing will take; it publishes a message and moves on, exactly companion §11 (Queues & Event-Driven Systems) established as the mental model justifying why synchronous, blocking coupling between these two concerns is often the wrong default in the first place.

### 36.3 Decision Framework: RabbitMQ (Task Distribution) vs. Kafka (Event Log) — Genuinely Different Tools

**RabbitMQ** is built around the traditional message-queue model: a message is delivered to (typically) one consumer, acknowledged once processed, and then removed from the queue — well suited to task distribution, where each unit of work should be handled exactly once by exactly one worker (a job queue, companion §85's capstone stage). **Kafka** is built around a durable, ordered, replayable **log**: messages are appended to a topic and retained for a configured period regardless of whether any consumer has read them yet, and multiple independent consumer groups can each read the *same* messages independently at their own pace — well suited to event streaming, where multiple different downstream systems each need to react to the same stream of events independently (an order-placed event feeding both an analytics pipeline and a notification service, neither aware of or blocking the other).

### 36.4 Python Mechanism: Delivery Guarantees — At-Most-Once, At-Least-Once, and Why Exactly-Once Is Nearly Unattainable End-to-End

**At-most-once** delivery means a message might be lost but is never processed twice — acceptable only for genuinely disposable data. **At-least-once** (the practical default for both RabbitMQ and Kafka in typical configurations) guarantees a message is never silently lost but may occasionally be delivered and processed more than once (a consumer crashes after processing but before acknowledging, causing redelivery) — meaning consumer code must be **idempotent** (directly §32.5's idempotency-key discipline, now applied to message consumption rather than HTTP retries) to handle this safely. True **exactly-once** delivery, end-to-end, across an arbitrary producer-broker-consumer pipeline, is a famously difficult distributed-systems guarantee to provide in full generality — in practice, "effectively exactly-once" is achieved by combining at-least-once delivery with idempotent consumer-side processing, not by the broker alone somehow guaranteeing it.

### 36.5 Tradeoff: A Broker Is Infrastructure You Now Operate, Not Just Code You Write

Introducing RabbitMQ or Kafka means a new, genuinely stateful piece of infrastructure your team now owns operationally — monitoring its health, planning its capacity, handling its own failure modes (a full disk, a lagging consumer group) — a real, ongoing cost distinct from and additional to the application code calling into it. This cost should be weighed against companion §108.7's trap (defaulting to a queue for every decoupling need) — a broker earns its operational cost specifically when reliable, asynchronous, decoupled processing is a genuine requirement, not a default reached for whenever two components merely *could* be decoupled.

### 36.6 Implementation

```python
import pika          # RabbitMQ client
import json

def publish_booking_created_event(booking: dict) -> None:
    connection = pika.BlockingConnection(pika.ConnectionParameters("localhost"))
    channel = connection.channel()
    channel.queue_declare(queue="booking_events", durable=True)  # durable:
                                                                    # survives
                                                                    # a broker
                                                                    # restart
    channel.basic_publish(
        exchange="",
        routing_key="booking_events",
        body=json.dumps(booking),
        properties=pika.BasicProperties(delivery_mode=2),  # persistent
    )                                                         # message
    connection.close()


def consume_booking_events(process_fn) -> None:
    connection = pika.BlockingConnection(pika.ConnectionParameters("localhost"))
    channel = connection.channel()
    channel.queue_declare(queue="booking_events", durable=True)

    def on_message(ch, method, properties, body):
        booking = json.loads(body)
        try:
            process_fn(booking)               # MUST be idempotent (§36.4) --
                                                  # this delivery could be a
                                                  # redelivery after a prior
                                                  # crash before ack
            ch.basic_ack(delivery_tag=method.delivery_tag)   # only ack AFTER
        except Exception:                                     # successful
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)  # processing
                                                                              # -- failure
                                                                              # means it
                                                                              # goes back
                                                                              # on the
                                                                              # queue

    channel.basic_consume(queue="booking_events", on_message_callback=on_message)
    channel.start_consuming()
```

`durable=True` on the queue declaration and `delivery_mode=2` on the published message both ensure the message survives a RabbitMQ broker restart — directly the durability guarantee §36.1 sought, unavailable from in-process `BackgroundTasks`. `basic_ack` is called only *after* `process_fn` completes successfully — if `process_fn` raises, `basic_nack(requeue=True)` puts the message back for redelivery, meaning `process_fn` must be written idempotently (§36.4), since it may genuinely be called more than once for the same logical booking event if a prior attempt failed partway through, after some side effect had already occurred but before the acknowledgment was sent.

### 36.7 Production Considerations

A consumer that acknowledges a message *before* fully processing it (acking immediately upon receipt rather than after successful completion) silently reintroduces at-most-once semantics even on an at-least-once-capable broker — if the consumer crashes mid-processing after that early ack, the message is gone with no redelivery, exactly the failure mode a broker was introduced to prevent in the first place; acknowledgment timing (ack only after genuine, successful completion, §36.6's pattern) is a specific, easy-to-get-backwards detail worth explicit code review attention. For Kafka specifically, **consumer lag** (how far behind the latest published message a consumer group has fallen) is a first-class production metric (companion §65) — a consumer group that's falling further behind over time, rather than keeping pace, is an early, measurable warning of a capacity or performance problem well before it becomes a user-visible incident.

### 36.8 Debugging

**Symptoms:** A background operation (an email, an inventory update) occasionally happens twice for what should be one logical event; messages appear to be silently lost specifically when a consumer process is restarted or deployed. **Investigation:** For duplicate processing, check whether the operation itself is idempotent (§36.4, §32.5) — a consumer receiving a legitimate redelivery is expected and correct broker behavior; the actual bug is almost always non-idempotent processing, not the redelivery itself. For lost messages during consumer restarts, check the acknowledgment timing (§36.7) — an early ack before processing genuinely completes is the most common root cause. **Root cause:** Non-idempotent message processing colliding with expected at-least-once redelivery; or acknowledgment issued before processing is truly complete, converting at-least-once into effectively at-most-once. **Fix:** Make consumer-side processing idempotent (using an idempotency key or a natural unique identifier already present in the message, §32.5's pattern applied here); move acknowledgment to strictly after successful processing completes, never before.

### 36.9 Interview Thinking

"How do you guarantee a message is processed exactly once?" is a question best answered by correcting its premise directly (§36.4) — a strong answer explains that true exactly-once delivery is rarely achievable end-to-end in a general distributed system, and that the practical, standard approach is at-least-once delivery combined with idempotent consumer processing, which achieves the same *effective* outcome the question is really asking about.

### 36.10 Mini Lab

Using a local RabbitMQ instance, implement §36.6's `publish_booking_created_event` and `consume_booking_events`, with `process_fn` checking an in-memory set of already-processed booking IDs (a simple idempotency mechanism) before doing anything, and printing whether a given booking is being processed for the first time or is a detected duplicate. Publish the same booking event twice deliberately and confirm the consumer correctly recognizes and skips the second delivery as a duplicate rather than double-processing it.

---
