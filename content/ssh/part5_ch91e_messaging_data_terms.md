## 91.E Messaging and Data Terms

### Dead Letter Queue (DLQ)

**Definition**: A separate queue that messages are moved to after repeatedly failing processing, specifically to unblock the main queue/partition (which would otherwise stall behind a message it can never successfully process) while preserving the failed message for later inspection rather than silently discarding it. See §40.5 for full mechanism.

**Real example**: A malformed event that repeatedly crashes its consumer being automatically routed to a DLQ after a bounded number of retry attempts, allowing every subsequent, healthy message in that partition to continue processing normally.

**Misconception**: A DLQ is not a substitute for fixing the underlying problem — it's a containment mechanism that buys time for diagnosis, not a resolution in itself; messages left indefinitely in a DLQ with no follow-up process represent silently lost work.

### Poison Message

**Definition**: A specific message that a consumer cannot successfully process, regardless of how many times it's retried, typically due to malformed data or a bug triggered specifically by that message's content. The direct cause of the DLQ pattern's necessity (§40.5).

**Real example**: An event with an unexpected, previously-untested field value that causes a deserialization error every single time the consumer attempts to process it.

**Detection**: A specific message ID or content pattern appearing repeatedly in retry/failure logs, distinct from generic, transient failure noise.

**Mitigation**: Defensive deserialization/validation at the consumer boundary, and DLQ routing (§40.5) to prevent one poison message from blocking an entire partition indefinitely.

### Idempotency

**Definition**: A property of an operation such that performing it multiple times has the same effect as performing it once — the foundational property that makes retries safe under at-least-once delivery guarantees. See §29.8 for the idempotency-key mechanism and §40.2.1 for its necessity under message queue semantics.

**Real example**: Stripe's widely-cited idempotency-key API design (§29.12) — a client-generated key ensures a retried payment charge request is recognized and only actually processed once, regardless of how many times the request is sent.

**Misconception**: Idempotency is not automatic for any given operation — an operation must be deliberately designed (via an idempotency key, a natural uniqueness constraint, or a check-before-act pattern) to have this property; assuming any retried operation is "probably fine" is the direct, common cause of duplicate-charge and duplicate-side-effect incidents.

### Write Amplification

**Definition**: The phenomenon where one logical write results in multiple physical writes to underlying storage — most notably in LSM-Tree-based storage engines, where a single write is written once at initial flush and rewritten again during every subsequent compaction that touches it. See §31.4 for full mechanism.

**Real example**: An LSM-Tree-based database under heavy, sustained write load showing actual disk I/O several times higher than the logical write volume alone would suggest, due to ongoing background compaction.

**Misconception**: Write amplification is not a bug or inefficiency to be "fixed" outright — it's an inherent, well-understood cost of the write-optimized LSM-Tree design, tunable (via compaction strategy) but never eliminated.

### Read Amplification

**Definition**: The corresponding read-side cost in LSM-Tree-based storage engines, where a single logical read may need to check multiple locations (the memtable and several SSTables) before finding or ruling out a key, because the same key's value can be scattered across multiple levels. See §31.4 for full mechanism and Bloom filters as the standard mitigation.

**Mitigation**: Bloom filters (probabilistically ruling out "this SSTable definitely doesn't contain this key" without an actual disk read) and index caching.

**Misconception**: Read amplification and write amplification are not the same cost, and reducing one (e.g., via more aggressive compaction) frequently increases the other — a direct, explicit tradeoff, not a problem with a single, universal fix.

### Sticky Sessions

**Definition**: A load-balancing strategy that routes all of a given user's requests consistently to the same backend server, typically used when that server holds request-relevant local state (a local cache, in-memory session data). See §28.3 for mechanism and §84.3-84.4 for a worked example of why it was rejected in favor of full statelessness in one real scenario.

**Real example**: An early-stage application relying on sticky sessions to keep a user's login session working correctly across multiple server instances, before session data is externalized to a shared store.

**Misconception**: Sticky sessions do not solve the underlying statelessness gap (§18.5) — they work around it for routing purposes, but a server holding sticky-session state still represents a single point of failure for every user routed to it, and uneven "stickiness" can still produce load imbalance across the fleet.

### Cold Start

**Definition**: The added latency incurred when a system (most commonly a serverless function, but also applicable to any component starting from an idle or newly-provisioned state) must be initialized from scratch before it can handle a request, because no already-warm instance was available. See §43.2 for full mechanism and its role in the compute-model tradeoff.

**Real example**: A serverless function that has scaled to zero due to inactivity taking measurably longer to respond to the next request than to any subsequent request served by the now-warm instance.

**Detection**: A bimodal latency distribution — a cluster of fast, warm-instance responses and a distinct cluster of much slower, cold-start responses — rather than a smooth, unimodal distribution.

**Mitigation**: Maintaining a minimum number of pre-warmed instances (at the cost of giving back some of serverless's cost advantage, §43.2), or choosing an always-on compute model for latency-critical, consistently-loaded workloads.

**Misconception**: Cold starts are not a flaw specific to any one vendor's serverless implementation — they are an inherent consequence of the "scale to zero" cost-efficiency tradeoff, present in some form across essentially every serverless platform.

---

*This concludes Part V. Every term in this encyclopedia was introduced in context earlier in this handbook — cross-references throughout point back to the chapter where each mechanism, algorithm, or tradeoff was originally developed in full.*

---
