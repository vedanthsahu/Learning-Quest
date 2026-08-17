## §45. SQS vs SNS vs EventBridge vs Kafka: Picking the Right Tool

### 1. The Vocabulary

- **SQS** — a point-to-point queue: one message, consumed by (typically) one consumer group.
- **SNS** — pub/sub fan-out: one message, delivered to every subscriber independently (often each
  subscriber is its own SQS queue).
- **EventBridge** — content-based event routing: rules decide which of many possible targets a
  given event goes to, based on the event's own content/type.
- **Kafka / RabbitMQ** — self-hosted (or managed) message brokers offering more control, higher
  throughput ceilings, and (for Kafka specifically) durable, replayable event logs — at the cost
  of more operational complexity than a managed cloud queue.

### 2. Where It Sits, and Why Teams Use It

These all solve "get a message from A to B reliably," but differ in fan-out shape (one consumer
vs. many), routing intelligence, and operational ownership — picking the right one for a given
use case is a real, common design decision, not just a matter of preference.

### 3. What Actually Breaks

- **Using SQS when multiple independent systems need the same event** — SQS is point-to-point; if
  three different services all need to react to "order placed," SNS fan-out (or EventBridge) is
  the right shape, not three services all polling the same SQS queue.
- **Using SNS/EventBridge when strict ordering matters** — plain SNS and EventBridge don't
  guarantee message order across a topic the way a single SQS FIFO queue or a Kafka partition
  does; using them for something that requires strict sequential processing is a design mismatch.
- **Reaching for Kafka "because it's what big companies use"** — Kafka's operational complexity
  (partition management, consumer group rebalancing, cluster maintenance) is a real cost that
  doesn't pay for itself unless you actually need its specific strengths (very high throughput,
  event replay, long retention) — a managed SQS/SNS setup is often simpler and sufficient.
- **Not understanding EventBridge's content-based routing** — assuming it behaves like SNS
  (deliver-to-everyone) instead of routing based on rules matched against the event's actual
  content leads to events either not reaching an intended target or reaching unintended ones.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "SQS is point-to-point; SNS fans out to every subscriber; EventBridge routes based on the
  event's content — I pick based on that shape, not habit."
- "For strict ordering, I need a FIFO queue or a Kafka partition specifically — plain SNS/
  EventBridge don't guarantee it."
- "I don't reach for Kafka by default — its operational complexity needs to be justified by an
  actual need for its specific strengths."

### 5. Interview-Ready Answer

> "I pick based on fan-out shape and ordering needs, not brand familiarity. One producer, one
> logical consumer group, order doesn't matter much — SQS. One event, multiple independent
> systems need to react — SNS fan-out or EventBridge, with EventBridge specifically when routing
> needs to depend on the event's own content. Strict ordering or very high throughput with replay
> needs — that's when Kafka's added operational complexity actually earns its cost."

### 6. Go Deeper

companion Cloud Engineering Playbook's §14 (Queues & Pub/Sub: SQS & SNS) chapter and companion
Cloud Engineering Playbook's §15 (EventBridge) chapter; companion Python Backend Engineering
Handbook's §36 (Message Brokers: RabbitMQ & Kafka) chapter (RabbitMQ/Kafka in depth).

---
