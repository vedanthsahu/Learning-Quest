## §112. Serverless and Event-Driven Architecture

### 1. The Vocabulary

- **Serverless (FaaS)** — you deploy a function, not a server; the platform (Lambda, Cloud
  Functions) handles provisioning, scaling to zero, and scaling up, and you pay per invocation.
- **Event-driven architecture** — services react to events (something happened) rather than being
  called directly (do this now) — decoupling producers from consumers through a broker (queue,
  topic, event bus).
- **Cold start** — the latency penalty when a serverless function is invoked after being idle and
  the platform has to spin up a fresh execution environment.
- **Event bus / broker** — the middleman (EventBridge, SNS, Kafka) that routes events from
  producers to whichever consumers have subscribed, without either side knowing about the other.
- **Choreography vs orchestration** — choreography: each service reacts to events independently,
  no central coordinator; orchestration: a central service explicitly calls each step in order.

### 2. Where It Sits, and Why Teams Use It

Serverless and event-driven are often mentioned together but are separate axes: you can write
event-driven code that runs on regular servers, and you can write request/response code that runs
on Lambda. Serverless is about *who manages the compute*; event-driven is about *how components
communicate*. Teams reach for serverless for spiky, infrequent, or highly variable workloads where
paying for idle servers is wasteful, and for event-driven design when they want services to evolve
independently without every new consumer requiring a change to the producer.

### 3. What Actually Breaks

- **Cold starts on the latency-critical path** — a Lambda behind a user-facing API can add hundreds
  of milliseconds of unpredictable latency exactly when a request finally arrives after idle time.
- **Event-driven systems with no way to trace a business transaction** — an order that touches five
  services via events, with no correlation ID (see §49) tying them together, becomes nearly
  impossible to debug when one step silently fails.
- **Choreography sprawl** — with no central view of "what happens when an order is placed," new
  engineers can't answer that question without grep-ing every service's event subscriptions; past
  a certain complexity, some explicit orchestration usually creeps back in.
- **Treating "event-driven" as a synonym for "reliable"** — an event bus can still drop, duplicate,
  or reorder events; without idempotent consumers (§44) and dead-letter queues (§43), event-driven
  systems fail just as concretely as any other distributed system.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I reach for serverless for spiky or infrequent workloads, and I'm cautious about cold starts on
  anything latency-sensitive and user-facing."
- "Event-driven decouples producers from consumers, but it doesn't remove the need for
  correlation IDs, idempotency, and dead-letter handling — it just moves where those problems show
  up."
- "Past a certain number of services, pure choreography gets hard to reason about — some
  orchestration for the critical, must-complete-in-order flows is usually worth the coupling."

### 5. Interview-Ready Answer

> "Serverless and event-driven are different decisions I evaluate separately. For serverless, I'm
> weighing cost-for-spiky-workloads against cold-start latency on anything user-facing. For
> event-driven, I like the decoupling — new consumers don't require producer changes — but I make
> sure every cross-service flow has a correlation ID for tracing, and that consumers are idempotent,
> because the event bus itself can still duplicate or reorder messages."

### 6. Go Deeper

companion Cloud Engineering Playbook's §2 (Lambda) chapter and companion Cloud Engineering
Playbook's §41 (Event-Driven & Microservices Patterns) chapter; this book's §42-46 (queues) and
§68 (EC2 vs Lambda vs containers) for the adjacent compute and messaging tradeoffs.

---
