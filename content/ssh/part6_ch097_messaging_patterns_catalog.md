## 97. Messaging and Integration Patterns Catalog

### 97.1 Why Messaging Patterns Deserve Their Own Named Catalog

§11 and §40-41 derived queues, delivery guarantees, and event-driven patterns from first principles. What that treatment deliberately didn't do is give you the full, named vocabulary the integration-patterns community (most influentially catalogued in Hohpe and Woolf's *Enterprise Integration Patterns*, already cited in §11.9 and §40.9) uses for the *specific shape* of a messaging interaction — vocabulary you need fluently the moment someone in a design review says "let's make this a competing-consumers setup" or "we need a content-based router here." This chapter supplies that vocabulary, in the same problem-first order as everywhere else in this handbook.

### 97.2 Publish-Subscribe vs. Point-to-Point: The Foundational Distinction

**The problem**: two different messaging needs are easy to conflate but require genuinely different infrastructure. Sometimes a message should be consumed by exactly *one* of several available workers (distributing load across a worker pool). Sometimes a message should be delivered to *every* independent, interested consumer (notifying every downstream system that "a user signed up," where each one reacts differently).

**Point-to-Point (the queue model)**: a message placed on a queue is delivered to exactly one consumer among however many are listening — this is the ordinary queue behavior already developed in §11.2-11.3 and §40, used specifically for work distribution.

**Publish-Subscribe (Pub/Sub)**: a message published to a topic is delivered to *every* subscriber currently registered on that topic, independently — this is the messaging-infrastructure realization of the Observer pattern (§94.4) at network scale, and it is the specific mechanism underlying the broader event-driven architecture style named in §96.1.

```
Point-to-Point (Queue):              Publish-Subscribe (Topic):

  Producer -> [ Queue ] -> ONE          Producer -> [ Topic ] -> Subscriber A
              of many workers                                -> Subscriber B
              consumes each                                  -> Subscriber C
              message                                        (EVERY subscriber
                                                                gets EVERY message)
```

**Tradeoff and decision framework**: choose Point-to-Point when the goal is *distributing* a fixed amount of work across a scalable pool of interchangeable workers (§40.4's consumer groups are the mechanism that actually implements this). Choose Pub/Sub when the goal is *broadcasting* a fact to an open-ended, independently-evolving set of interested systems, each of which may react completely differently and none of which the publisher should need to know about in advance (§11.5). A single real messaging system (Kafka, most notably) can implement both patterns simultaneously depending on how consumer groups are configured — recognizing which pattern a given configuration is actually implementing is the interview-relevant skill, not memorizing that "Kafka is Pub/Sub" as a blanket label.

### 97.3 Fan-Out, Fan-In, Scatter-Gather, and Competing Consumers

**Fan-Out** and **Fan-In** (Part V, §91.D) and **Scatter-Gather** (Part V, §91.D) were already given full encyclopedia treatment — included here only to place them explicitly within this messaging catalog: Fan-Out is one message triggering many downstream effects (often implemented via Pub/Sub, §97.2); Scatter-Gather is a specific *request/response* variant of fan-out where the responses must be collected and merged (§76.2's distributed search being the canonical example).

**Competing Consumers** — *Problem*: a single consumer cannot keep up with a queue's incoming message rate. *Solution*: run multiple consumer instances against the same queue, each competing for and processing a different message — directly the Point-to-Point pattern (§97.2) with more than one worker, and the exact mechanism underlying §40.4's consumer groups and §18.4's horizontal scaling, now named as an explicit, standalone integration pattern.

### 97.4 Request-Reply Over Asynchronous Messaging

**Problem it answers**: a caller using an asynchronous queue (§11.2) still sometimes needs an actual response to a specific request — not just fire-and-forget. **Solution**: the requester includes a unique correlation ID and a "reply-to" address in its outgoing message; the responder processes the request and publishes a reply message tagged with that same correlation ID to the specified reply destination, which the original requester is listening on. **Tradeoff**: preserves the resilience benefits of asynchronous messaging (§11.3) while still supporting a request/response interaction shape, at the cost of the requester needing to manage matching replies to outstanding requests (typically via a timeout and the correlation ID) rather than simply blocking on a synchronous call.

### 97.5 Change Data Capture (CDC)

**Problem it answers**: §41.2's outbox pattern requires deliberately writing an event to an outbox table inside the same transaction as a business write — but for legacy systems, or systems where modifying application code to add outbox writes isn't feasible, this isn't always practical. **Solution**: **Change Data Capture** reads a database's own internal write-ahead log (§31.5) directly, turning every committed row-level change into a stream of events automatically, without any application code changes at all. **Tradeoff versus the Outbox Pattern**: CDC requires no application code changes and captures literally every change (including ones made by other systems or manual intervention), but it operates one layer lower than the outbox pattern and can expose low-level storage details (raw row changes) that don't always map cleanly onto meaningful, well-shaped business events — the outbox pattern lets the application deliberately choose and shape what constitutes a meaningful "event," while CDC captures everything indiscriminately at the storage layer. **Real-world examples**: Debezium is the most widely-cited open-source CDC implementation, commonly used to stream a legacy relational database's changes into a Kafka topic (§66) without modifying the legacy application at all.

### 97.6 Retry Queue, Priority Queue, and Delayed Queue

**Retry Queue** — a specific, separate queue (distinct from the main Dead Letter Queue, §91.E) that a failed message is routed to for a bounded number of automatic reattempts, typically with increasing delay between attempts (directly the exponential backoff discipline from §64.5, applied at the queue-infrastructure level), before finally escalating to a true DLQ only if retries are exhausted.

**Priority Queue** — *Problem*: not all queued work is equally urgent, and a strict first-in-first-out queue (§40.3) processes a low-priority bulk job ahead of a just-arrived, time-sensitive request purely because of arrival order. *Solution*: messages carry an explicit priority, and the queue serves higher-priority messages first, directly connecting to the priority-inversion risk from §25.2 and Part V §91.B if a *low*-priority message's processing itself blocks a shared resource a high-priority message needs.

**Delayed Queue** — *Problem*: a message needs to become available for processing only after a specific future time, not immediately (a reminder notification scheduled for 24 hours later, or a retry with a deliberate backoff delay, §97.6 above). *Solution*: the queue holds the message invisibly until its scheduled time arrives, then makes it available to consumers exactly as an ordinary message — the standard mechanism underlying both scheduled-task features and the retry-with-backoff pattern just described.

### 97.7 Content-Based Router, Aggregator, and Splitter

**Content-Based Router** — *Problem*: different messages on the same logical stream need to be routed to different downstream consumers based on the message's own content (an order above a certain value routed to a manual-review service; all others routed directly to auto-fulfillment). *Solution*: an explicit routing component inspecting each message's content and directing it accordingly — the messaging-infrastructure analogue of an HTTP router directing requests by path (§28.2's L7 routing), now applied to asynchronous messages instead of synchronous requests.

**Aggregator** — *Problem*: a single logical business outcome depends on collecting several related, individually-arriving messages before proceeding (an order isn't ready to ship until *both* its payment-confirmed event and its inventory-reserved event have both arrived, in whatever order). *Solution*: a stateful component holding partial results until a defined completion condition (all expected messages received, or a timeout) is met, then emitting one combined result — directly the messaging-infrastructure counterpart to Scatter-Gather's "gather" phase (§97.3), generalized beyond a single request/response round trip to independently-arriving asynchronous events.

**Splitter** — *Problem*: a single incoming message logically represents multiple, independently-processable units of work (one uploaded file containing a thousand records, each of which should be processed and tracked independently). *Solution*: a component that breaks the single message into multiple, individually-emitted messages — the direct inverse of the Aggregator, and together, Splitter and Aggregator are frequently used as a matched pair bracketing a batch of parallel, independent processing steps.

### 97.8 Message Translator, Message Filter, and Claim Check

**Message Translator** — *Problem*: two systems need to exchange messages but expect different data formats or schemas (directly the same integration-boundary mismatch problem that motivates the Adapter pattern, §94.3, now applied to asynchronous messages instead of synchronous method calls). *Solution*: a dedicated component that translates a message from one system's expected format into another's, without either system needing direct knowledge of the other's schema.

**Message Filter** — *Problem*: a consumer is only interested in a subset of messages flowing through a channel and shouldn't need to implement its own discard logic for the rest. *Solution*: a component upstream of the consumer that discards messages not matching a specified condition, keeping the consumer's own logic focused purely on messages it actually cares about.

**Claim Check** — *Problem*: a message needs to carry a large payload (a big file, an extensive data blob), but message brokers are generally optimized for small, frequent messages, and passing large payloads directly through the broker (§40) degrades its performance for every other message sharing that infrastructure. *Solution*: store the large payload in a separate, purpose-built store (object storage, §43.3) and pass only a small reference/"claim check" through the actual message — directly the object-storage-versus-message-broker tradeoff already implied by §43.3's storage-category distinctions, now named as an explicit integration pattern for exactly this recurring situation.

### 97.9 Resequencer, Idempotent Receiver, Guaranteed Delivery, and Transactional Messaging

**Resequencer** — *Problem*: §40.3 established that messages within one partition are ordered, but messages arriving from *multiple* partitions or multiple upstream sources may arrive out of their original logical order at a downstream consumer. *Solution*: a component that buffers and reorders incoming messages according to a sequence identifier before passing them along, restoring the ordering guarantee a downstream consumer needs even though the transport itself didn't provide it end-to-end.

**Idempotent Receiver** — the named, general integration-pattern term for exactly the consumer-side idempotency discipline already developed in full in §29.8 and §40.2.1 (recording processed message IDs and skipping duplicates) — included here specifically so the term is recognized when used in this more general, pattern-catalog vocabulary rather than only in its systems-engineering framing.

**Guaranteed Delivery** — the pattern-catalog name for ensuring a message is not lost even if the receiving system is temporarily unavailable, achieved via the combination of durable message storage (the write-ahead-log-backed durability from §31.5, applied to the broker's own storage) and the at-least-once redelivery semantics from §40.2.

**Transactional Messaging** — the pattern-catalog name for coordinating a message send with a local database transaction so that both succeed or both fail together — precisely the problem the Outbox Pattern (§41.2, Part V §91.D) solves, named here in its more general integration-patterns vocabulary.

### 97.10 Engineering Intuition for This Catalog

> **How do I know if I need Pub/Sub or a plain point-to-point queue?** Ask whether exactly one consumer should handle each message (queue) or every interested party should independently receive every message (Pub/Sub, §97.2) — this single question resolves the large majority of "which messaging pattern" interview questions.
>
> **How do I know if I need CDC instead of the Outbox Pattern?** If you can freely modify the application code writing the data, Outbox (§41.2) gives you deliberately-shaped, meaningful business events. If you cannot (a legacy system, a third-party database) or need to capture literally every change with no application involvement, CDC (§97.5) is the correct tool.
>
> **What would over-engineering this catalog look like?** Introducing a Content-Based Router, Aggregator, and Splitter for a simple, single-consumer queue with one message type — real, useful patterns applied to a problem simple enough that a plain queue (§40) already solves it completely.

### 97.11 Exercises

1. A system needs to notify three unrelated internal teams' services whenever a user closes their account, with each team's service reacting completely differently and none of them needing to know about the others. Using §97.2, name the correct pattern and explain why a point-to-point queue would be the wrong choice here.
2. A legacy inventory system cannot be modified to add outbox-pattern event publishing. Using §97.5, propose an alternative approach and explain its tradeoff compared to the Outbox Pattern.

---
