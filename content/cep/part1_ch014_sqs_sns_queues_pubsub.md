## 14. Queues & Pub/Sub: SQS & SNS

> **Decision Snapshot** — Tier 1 · Messaging · Verdict: SQS for point-to-point work distribution (one message, one consumer); SNS for fan-out (one message, many subscribers) — the two are almost always used together, not as alternatives to each other. Primary alternative: EventBridge if you need content-based routing rules rather than simple topic-based fan-out.

### One-Line Summary
SQS is a durable queue for decoupling producers from consumers; SNS is a pub/sub topic for fanning one message out to many subscribers — together, the standard building blocks of asynchronous, decoupled architectures on AWS.

### Category
Messaging

### Tier
Tier 1

### What They Do
**SQS** (Simple Queue Service) holds messages until a consumer explicitly processes and deletes them, providing durable, at-least-once delivery and decoupling a producer's pace from a consumer's — the direct AWS-managed instance of the queue concept the companion Software Systems Handbook and Python Backend Handbook both teach in depth (delivery guarantees, visibility timeouts, dead-letter queues). **SNS** (Simple Notification Service) is a pub/sub topic — a publisher sends one message, and every current subscriber (which can include SQS queues, Lambda functions, HTTP endpoints, email, or SMS) receives a copy. The two compose naturally in the **fan-out pattern**: publish once to SNS, have multiple SQS queues subscribed, and each downstream consumer processes independently at its own pace, isolated from the others' failures.

### When Should I Use SQS
- Decoupling a producer from a consumer that processes at its own pace (a background job queue, companion Python Backend Handbook §37).
- Buffering bursty traffic so a downstream consumer isn't overwhelmed by a traffic spike.
- Any point-to-point "exactly one consumer should handle this message" requirement.

### When Should I Use SNS
- Fanning one event out to multiple independent subscribers (e.g., "order placed" needing to trigger inventory update, email notification, and analytics recording, independently).
- Simple topic-based pub/sub where subscribers don't need content-based filtering rules — for that, prefer EventBridge (companion §15).

### When Should I NOT Use Either
- You need content-based routing (route based on message attributes to different targets with different rules) — that's EventBridge's specific strength (companion §15).
- You need strict message ordering across the entire queue — standard SQS doesn't guarantee it; FIFO SQS queues do, at a throughput tradeoff.

### Common Real-World Use Cases
- Background job processing: API enqueues to SQS, a worker fleet (EC2/ECS/Lambda) consumes at its own pace.
- Fan-out on a business event: SNS topic with several SQS queue subscribers, each an independent downstream system.
- Dead-letter queues capturing messages that repeatedly fail processing, for later investigation rather than being lost or retried forever.

### Typical Architecture
```
Producer → SNS Topic (fan-out)
                ↓              ↓              ↓
          SQS Queue A    SQS Queue B    SQS Queue C
                ↓              ↓              ↓
          Worker Fleet    Lambda         Analytics Pipeline
     (each isolated -- one queue's failure doesn't affect the others)
```
Each SQS queue subscribed to the SNS topic processes independently — this is the direct mechanism that makes fan-out failure-isolated: if the analytics pipeline's queue backs up or fails, the order-fulfillment queue is entirely unaffected, since it's a separate queue with its own consumers.

### Important Concepts
- **Visibility timeout (SQS)** — how long a message is hidden from other consumers after being received, before it becomes visible again if not deleted; too short causes duplicate processing, too long delays retry of a genuinely failed message.
- **Dead-letter queues (SQS)** — after a message fails processing a configured number of times, it's moved to a separate queue for investigation rather than retried forever or silently dropped — the direct mechanism preventing a poison-pill message from looping indefinitely (companion Python Backend Handbook §94.4's exact concern).
- **Standard vs. FIFO queues (SQS)** — Standard offers at-least-once delivery with best-effort ordering and near-unlimited throughput; FIFO guarantees exactly-once processing and strict ordering within a message group, at a lower throughput ceiling.
- **At-least-once delivery** — both SQS and SNS can, under real-world failure conditions, deliver a message more than once; consumer logic must be idempotent (companion Python Backend Handbook §32.6), this is not optional.
- **SNS message filtering** — subscribers can specify a filter policy so they only receive messages matching specific attributes, avoiding the need for every subscriber to receive and then discard irrelevant messages.

### Security Considerations
Use resource policies on both SQS queues and SNS topics to restrict which accounts/services can publish or subscribe — an open queue/topic policy is a real, if less commonly discussed, exposure surface. Enable encryption at rest (SSE) for both, especially for queues/topics carrying anything sensitive. Use IAM policies scoped to specific queue/topic ARNs, not account-wide messaging permissions.

### Monitoring
For SQS: `ApproximateNumberOfMessagesVisible` (queue depth — a growing, non-draining value is the direct symptom companion §53's failure-engineering chapter is about), `ApproximateAgeOfOldestMessage` (a message sitting unprocessed for a long time even if depth looks fine), and dead-letter queue depth (should normally be near zero — any sustained non-zero value warrants investigation). For SNS: delivery success/failure rates per subscription type.

### Scaling
SQS Standard queues scale to near-unlimited throughput automatically; FIFO queues have a bounded (though still substantial, and increasable via higher throughput mode) per-queue or per-message-group throughput ceiling. SNS scales fan-out automatically to a large number of subscribers. The consumer side — the worker fleet actually processing messages — is almost always the real, practical scaling bottleneck, not the queue/topic itself.

### Cost Model
Both are billed per request (per million API calls) — genuinely inexpensive at typical application volume, though very high-throughput, chatty polling patterns (long polling with a very short wait time, or aggressive short polling) can add up. SNS additionally bills per notification delivered, varying by subscription protocol (SMS is meaningfully more expensive per-message than SQS/Lambda/email deliveries).

### Common Mistakes
- Writing a consumer that isn't idempotent, producing duplicate side effects (a duplicate charge, a duplicate email) under SQS/SNS's at-least-once delivery guarantee.
- Setting a visibility timeout shorter than a message's actual typical processing time, causing the same message to be picked up by a second consumer while the first is still working on it.
- Not configuring a dead-letter queue, letting a poison-pill message retry indefinitely and consume worker capacity forever.
- Using short polling (constant, rapid empty-queue checks) instead of long polling, wasting requests and adding needless cost/latency.
- Reaching for SNS+SQS fan-out when EventBridge's content-based routing rules would actually fit the requirement better (multiple, differently-filtered downstream consumers of the same event stream).

### Migration Path
**Outgrowing SNS's routing model**: once you need genuine content-based routing (different rules per message attribute, not just simple topic-wide fan-out), migrate to EventBridge (companion §15). **Downgrading**: rare for SQS specifically — it's a foundational, rarely-outgrown building block; a genuinely simple, single-consumer use case might not need SNS's fan-out layer at all if there's truly only ever one subscriber.

### Interview Questions
1. What's the practical difference between SQS and SNS, and why are they usually used together, not as alternatives?
2. What does the visibility timeout control, and what happens if it's set too short or too long?
3. Why must a consumer of an SQS-delivered message be idempotent?
4. What's the difference between Standard and FIFO SQS queues, and what do you give up choosing FIFO?
5. How does a dead-letter queue prevent a poison-pill message from looping forever?
6. When would you choose SNS's fan-out over EventBridge's rule-based routing?
7. How would you design a system where five independent downstream systems all need to react to the same business event?
8. What's the cost/latency tradeoff between long polling and short polling on SQS?

### Python Example
```python
import boto3
import json

sqs = boto3.client("sqs", region_name="us-east-1")
QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/123456789012/order-processing"

def process_messages():
    # Long polling (WaitTimeSeconds > 0) -- avoids the short-polling cost/latency
    # mistake named above by waiting for messages rather than repeatedly polling empty.
    response = sqs.receive_message(
        QueueUrl=QUEUE_URL, MaxNumberOfMessages=10, WaitTimeSeconds=20,
        VisibilityTimeout=60,  # sized to comfortably exceed real processing time
    )
    for message in response.get("Messages", []):
        body = json.loads(message["Body"])
        order_id = body["order_id"]
        if fulfill_order_idempotently(order_id):        # must tolerate re-delivery
            sqs.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=message["ReceiptHandle"])
        # if processing fails, the message is NOT deleted -- it becomes visible
        # again after VisibilityTimeout and is retried, eventually reaching the DLQ

def fulfill_order_idempotently(order_id: str) -> bool:
    # Check-then-act against a persisted "already fulfilled" record, not a bare retry --
    # exactly the idempotency discipline required by at-least-once delivery.
    ...
```
`sqs.delete_message` is only called after successful processing — a message that fails is left in the queue, becoming visible again after `VisibilityTimeout` and retried, which is precisely why `fulfill_order_idempotently` must genuinely tolerate being called more than once for the same `order_id` rather than assuming single delivery.

### Best Practices
- Always design consumers to be idempotent — at-least-once delivery is a guarantee, not an edge case.
- Configure a dead-letter queue on every production SQS queue.
- Use long polling, not short polling.
- Size the visibility timeout to comfortably exceed real, measured processing time.
- Use SNS message filtering so subscribers only receive messages relevant to them.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Message Queue | SQS | Azure Queue Storage / Service Bus | Pub/Sub (also handles topic fan-out) |
| Pub/Sub Topic | SNS | Azure Service Bus Topics | Pub/Sub |

---
