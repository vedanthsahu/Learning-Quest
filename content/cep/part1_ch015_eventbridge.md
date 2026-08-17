## 15. EventBridge

> **Decision Snapshot** — Tier 1 · Messaging · Verdict: the default choice for event-driven architectures needing content-based routing across many event sources and targets. Primary alternative: SNS+SQS (companion §14) for simpler, uniform fan-out with no per-subscriber filtering logic needed.

### One-Line Summary
A serverless event bus that routes events to targets based on content-matching rules, natively integrated with most AWS services and easily extended to your own custom applications and SaaS partners.

### Category
Messaging

### Tier
Tier 1

### What It Does
EventBridge receives events (from AWS services emitting them natively, from your own application via `PutEvents`, or from integrated SaaS partners) onto an event bus, and routes them to targets — Lambda, SQS, Step Functions, and dozens of others — based on rules that match against the event's content (its source, type, or any field in its payload), not just a fixed topic subscription. This is the key difference from SNS: instead of every subscriber to a topic receiving every message and filtering client-side, EventBridge evaluates routing rules centrally and only invokes targets whose rule actually matches.

### When Should I Use It?
- Event-driven architectures where different consumers need different subsets of events based on content, not just topic membership.
- Reacting to native AWS service events (an EC2 state change, an S3 upload, a CodePipeline stage completion) without building custom polling.
- Scheduled tasks (replacing traditional cron) via scheduled rules.
- Integrating SaaS partner events (e.g., a third-party status change) into your own event-driven pipeline.

### When Should I NOT Use It?
- Simple, uniform fan-out where every subscriber genuinely wants every message — SNS's simpler model (companion §14) fits without the added complexity of writing rule-matching patterns.
- Extremely high-throughput, low-latency internal messaging where EventBridge's per-event evaluation overhead isn't worth it relative to a direct SQS/SNS path.

### Common Real-World Use Cases
- Central event bus for a microservices architecture, with each service's Lambda/SQS target subscribing only to the specific event types it cares about.
- Scheduled jobs replacing traditional cron (EventBridge Scheduler).
- Reacting to AWS infrastructure events (auto-remediating a failed deployment, alerting on a specific CloudTrail-logged API call).

### Typical Architecture
```
Event Sources: your app / AWS services / SaaS partners
        ↓ (PutEvents)
   EventBridge Event Bus
        ↓ (rule: source="orders", type="OrderPlaced")   ↓ (rule: source="orders", type="OrderCancelled")
     Target: Inventory Lambda                         Target: Refund Step Function
```
Two different rules on the same bus route the *same event stream* to entirely different targets based on the event's actual content — this content-based branching, done centrally rather than in each subscriber's own code, is EventBridge's core value over SNS's simpler "everyone subscribed gets everything" model.

### Important Concepts
- **Event buses** — the default bus (shared, AWS-service events land here automatically), custom buses (your own application's events, isolated from the default bus's noise), and partner buses (SaaS integrations).
- **Rules and event patterns** — JSON pattern-matching against an event's structure; a rule fires its associated targets only for events matching the pattern, which can match on nested fields, not just top-level attributes.
- **Schema Registry** — EventBridge can infer and store the schema of events flowing through a bus, useful for generating code bindings and catching structural drift.
- **Archive and replay** — events can be archived and later replayed against current rules, valuable for reprocessing after a bug fix or backfilling a new consumer.
- **EventBridge Pipes** — a point-to-point integration (source to target, with optional filtering/enrichment) for simpler cases that don't need full bus/rule complexity.

### Security Considerations
Use resource-based policies to control which accounts can put events onto a bus or which can be targeted by cross-account rules. Scope IAM permissions for `PutEvents` narrowly to the specific bus, not account-wide EventBridge access. For sensitive event payloads, consider whether the event itself should carry the sensitive data at all, or just a reference (an ID) that the target then looks up with its own, appropriately-scoped permissions.

### Monitoring
`FailedInvocations` and `ThrottledRules` per rule are the key signals that a target isn't receiving events it should be; a Dead Letter Queue can (and should) be configured per rule/target so undeliverable events aren't silently dropped, mirroring the same discipline SQS's dead-letter queues provide (companion §14).

### Scaling
EventBridge scales automatically to high event volumes with no capacity provisioning; per-account and per-rule throughput limits exist and are raisable via support request if a genuinely high-volume use case needs it. The practical constraint is almost always a specific target's own capacity (a Lambda function's concurrency limit, an SQS queue's consumer throughput), not the bus itself.

### Cost Model
Billed per million events published to a custom bus (events from AWS services to the default bus are free); rules themselves have no separate charge beyond the events they process. Schema discovery and archive/replay have their own, smaller, usage-based costs.

### Common Mistakes
- Using EventBridge for simple uniform fan-out where SNS would be simpler and sufficient, adding unnecessary rule-matching complexity.
- Not configuring a dead-letter queue per rule/target, silently losing events a target failed to process.
- Writing an overly broad event pattern that matches more than intended, causing a target to receive events it shouldn't.
- Putting genuinely sensitive data directly in event payloads rather than a reference, widening the exposure surface to every rule that happens to match.

### Migration Path
**From SNS**: the natural migration once fan-out subscribers need genuinely different, content-based subsets of the event stream rather than all of it. **Outgrowing it**: extremely rare at the service level — EventBridge scales to very high volumes; the practical limit is almost always a downstream target's own capacity.

### Interview Questions
1. What's the core difference between EventBridge's routing model and SNS's?
2. How do event patterns work, and what happens when an event matches more than one rule?
3. What's EventBridge Schema Registry, and what problem does it solve?
4. Why would you configure a dead-letter queue on an EventBridge rule/target?
5. What's the difference between the default event bus, a custom bus, and a partner bus?
6. How would you design a system reacting differently to "OrderPlaced" versus "OrderCancelled" events from the same source?
7. When would you choose EventBridge over Step Functions for orchestrating a multi-step process?

### Python Example
```python
import boto3
import json

eventbridge = boto3.client("events", region_name="us-east-1")

eventbridge.put_events(
    Entries=[{
        "Source": "orders.service",
        "DetailType": "OrderPlaced",
        "Detail": json.dumps({"order_id": "12345", "total": 4999, "customer_id": "cust-001"}),
        "EventBusName": "orders-bus",   # a custom bus, isolated from default-bus AWS-service noise
    }]
)

# A rule matching only OrderPlaced events over a certain total, routed to a
# fraud-review Lambda -- content-based routing SNS alone can't express this simply.
eventbridge.put_rule(
    Name="high-value-order-review",
    EventBusName="orders-bus",
    EventPattern=json.dumps({
        "source": ["orders.service"],
        "detail-type": ["OrderPlaced"],
        "detail": {"total": [{"numeric": [">", 10000]}]},
    }),
)
```
The rule's `EventPattern` matches specifically on `detail.total > 10000` — a genuinely content-based condition, not just a topic subscription — routing only unusually large orders to a fraud-review target while every other order event on the same bus is entirely unaffected, exactly the capability that distinguishes EventBridge from SNS's simpler model.

### Best Practices
- Use custom event buses to isolate your application's own events from AWS-service noise on the default bus.
- Configure dead-letter queues on every rule/target in production.
- Keep event payloads to what's needed for routing plus a reference ID; fetch sensitive detail separately with properly scoped access.
- Prefer SNS for genuinely uniform fan-out; reach for EventBridge specifically when content-based routing is the actual requirement.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Event Bus / Content-Based Routing | EventBridge | Azure Event Grid | Eventarc |

---
