## 102. Engineering Decision Catalog: Decision Trees, Not Technology Recommendations

### 102.1 Why This Chapter Is Structured Differently

Every other chapter in this Part has cataloged a *name*. This chapter catalogs *judgment* — the actual decision trees this handbook's philosophy (§0.1, §1.5) implies for the questions engineers are asked most often, in interviews and in real design reviews alike. Every tree below terminates in "it depends, and here specifically is what it depends on" rather than a fixed answer, because a fixed answer would itself violate the founding principle this entire handbook has maintained since Chapter 1.

### 102.2 Should I Cache?

```
Is the data read far more often than it's written? (§10.2)
  NO  -> Don't cache. Low read/write ratio means little locality
         to exploit; caching overhead likely exceeds benefit.
  YES -> Can this specific data tolerate being briefly stale?
         (§10.3, §80.3's per-dataset consistency analysis)
    NO  -> Don't cache this data (or cache with a very short TTL
           and accept the added complexity, §39.2).
    YES -> Is there a SPECIFIC, MEASURED bottleneck (slow query,
           connection exhaustion, §83.2) this would resolve?
      NO  -> Don't cache yet (§1.5) -- wait for the measured
             symptom before adding this complexity.
      YES -> Cache it (§39), choosing cache-aside vs read-through
             (§99.2) based on whether other services share this
             cache, and adding stampede protection (Part V §91.A)
             if this is a high-traffic key.
```

### 102.3 Should I Shard?

```
Is a SINGLE, well-indexed, vertically-scaled, replicated
primary genuinely insufficient for current + near-term write
volume? (§8.6, §35, measured via §56's estimation method)
  NO  -> Don't shard. This is the single most commonly
         over-adopted pattern in real practice (§90.4) --
         caching, indexing, and vertical scaling solve the
         overwhelming majority of real workloads first.
  YES -> Is the access pattern dominated by point lookups on a
         known key, or by range queries?
    Point lookups  -> Hash partitioning (§35.2), avoiding
                       hot-shard risk from skewed key ranges.
    Range queries  -> Range partitioning, accepting the hot-
                       shard risk and mitigating it explicitly
                       (§35.3), OR hash-partition and accept
                       fan-out cost for range queries (§76.2).
  Then: plan the migration with staged, verified, dual-write
  cutover (§35.4, §63.3) -- never a single "big bang" cutover.
```

### 102.4 Should I Introduce a Message Queue (Kafka or Otherwise)?

```
Does the caller genuinely need an immediate answer to proceed?
(§11.4, §4.4)
  YES -> Don't use a queue for this operation. Keep it
         synchronous.
  NO  -> Is this operation's latency/failure currently
         measurably affecting a critical user-facing path?
         (§84.4's worked example)
    NO  -> Don't introduce a queue yet -- solving a problem
           that hasn't manifested yet (§1.5).
    YES -> Do you need ordering guarantees for related events?
      YES -> Partition by the key whose ORDER actually matters
             (§40.3), not an arbitrary or convenient key.
      NO  -> Simple queue suffices; partition for parallelism
             alone.
  Then: is one consumer meant to process each message
  (Point-to-Point, §97.2) or should every interested service
  independently receive it (Pub/Sub, §97.2)? This determines
  whether you actually need Kafka-style topics/consumer groups
  or a simpler point-to-point queue.
```

### 102.5 Should I Split Into Microservices?

```
Is there REAL, MEASURED organizational pain (teams blocking
each other, §12.3) OR operational pain (wildly different
per-component scaling needs, §12.3)?
  NEITHER -> Stay monolithic (§12.2, §95.2). This is the
             second most commonly over-adopted pattern in real
             practice, alongside premature sharding.
  ONE OR BOTH, but team is small (<~10 engineers) or pain is
  localized to one clean boundary
    -> Consider a Modular Monolith (§95.3) or a single,
       well-justified service extraction (§85.3's worked
       example) -- not a full decomposition yet.
  BOTH, diffuse across most of the codebase, team is large
    -> Full domain-driven decomposition is justified (§86.3),
       aligned with team boundaries per Conway's Law (§67.2).
  Then: expect to now need circuit breakers, bulkheads (§42.4-
  42.5), and contract versioning (§29.6) that a monolith never
  required (§12.4) -- this cost is real, not optional.
```

### 102.6 Should I Use gRPC or REST (or GraphQL)?

```
Is this API for INTERNAL service-to-service calls, or an
EXTERNAL, public-facing API?
  INTERNAL, both ends controlled by your org
    -> Do clients benefit meaningfully from generated,
       strongly-typed stubs and lower serialization overhead?
       YES -> gRPC (§29.4).
       NO, simplicity/debuggability matters more -> REST is fine.
  EXTERNAL, broad, unpredictable client compatibility needed
    -> REST (§29.2-29.3) remains the safest default for
       maximum compatibility and human debuggability.
    -> Do callers have HIGHLY VARIED data needs causing
       round-trip multiplication or over-fetching? (§29.5)
       YES -> Consider GraphQL, accepting its query-complexity
              and caching-difficulty costs (§29.5).
       NO  -> Plain REST; GraphQL's cost isn't justified.
```

### 102.7 Should I Choose a Relational Database or NoSQL?

```
Per dataset (§7.5), not once for the whole system:
Does this specific data have important, ENFORCED relationships
and need multi-row transactional guarantees? (§7.3, §32.2)
  YES -> Relational database.
  NO  -> What's the DOMINANT access pattern for this data?
    Whole-document read/write together -> Document database
    Simple key->value lookup only      -> Key-value store
    Massive, sparse, wide rows          -> Wide-column store
    Relationship TRAVERSAL is the point -> Graph database
    Fuzzy relevance/similarity          -> Search or vector
                                            store (§21, §54)
  Then: verify this data's actual volume/access pattern
  genuinely EXCEEDS what a well-indexed, well-cached relational
  database could serve (§7.6) before committing to the added
  operational cost of running a second database technology.
```

### 102.8 Should I Introduce CQRS?

```
Are read and write access patterns for this data GENUINELY
different enough that one shared model serves neither well?
(§41.4, §7.2's normalization tension)
  NO  -> Don't introduce CQRS. A single, well-indexed model
         (with ordinary caching, §10) handles the common case.
  YES -> Can the read model tolerate being eventually
         consistent with the write model? (§41.4)
    NO  -> CQRS's read-model lag is likely unacceptable here;
           reconsider, or invest in tighter sync (at real cost).
    YES -> Introduce CQRS: separate write model (normalized,
           §7.3) and read model (denormalized, purpose-built
           per query need), connected via the Outbox Pattern
           (§41.2, §97.9) publishing write-side changes as
           events the read-model builder consumes.
```

### 102.9 Should I Introduce Event Sourcing?

```
Does this specific entity's FULL HISTORY have genuine business,
audit, or debugging value beyond its current state? (§41.6)
  NO  -> Don't use event sourcing. Store current state directly
         -- simpler to query and reason about.
  YES -> Can you accept that "what is the current state" now
         requires replaying events or maintaining a projection,
         rather than a simple row lookup? (§41.6's real cost)
    NO  -> Reconsider -- this cost is substantial and not always
           worth paying just for the audit-trail benefit; a
           separate, explicit audit log alongside normal state
           storage may serve the same need more cheaply.
    YES -> Event sourcing is justified for this entity
           specifically -- not necessarily for the whole system.
```

### 102.10 Should I Use Redis (or a Similar In-Memory Store)?

```
What is the ACTUAL need?
  Caching computed/fetched data           -> Yes, Redis fits
                                              (§10, §39) well.
  Distributed locking (§100.1)            -> Usable, but know
                                              the lease-expiry
                                              hazard explicitly.
  Rate limiting counters (§60.2, §99.3)   -> Yes, a very common,
                                              well-suited use case.
  Durable, primary system-of-record data  -> NO -- Redis's
                                              durability model
                                              is not equivalent
                                              to a primary
                                              database's (§6.6),
                                              even with
                                              persistence options
                                              enabled.
  Pub/Sub messaging (§97.2)               -> Usable for simple,
                                              low-durability-
                                              requirement cases;
                                              a dedicated broker
                                              (§40, §66) if
                                              delivery guarantees
                                              (§40.2) matter.
```

### 102.11 Should I Add a CDN?

```
Is a meaningful fraction of traffic geographically distant
from your origin, OR is a meaningful fraction of traffic for
STATIC/cacheable content? (§59.2, §59.4)
  NEITHER -> Not yet justified.
  EITHER  -> Add a CDN for static/cacheable content -- this is
             one of the cheapest, highest-leverage, lowest-risk
             additions in this entire catalog (§59.8), and is
             frequently justified even at otherwise-modest scale.
```

### 102.12 The Meta-Pattern Underlying Every Tree in This Chapter

Notice that every single tree above has the identical shape: state the specific, measurable condition first; only introduce the sophisticated pattern once that condition is confirmed true; and explicitly name the cost accepted in exchange. This is not a coincidence specific to this chapter — it is §1.5 and §80.5's five-question framework, restated as a literal decision tree for each of the questions engineers are asked most often. If you internalize nothing else from this catalog, internalize the shape of the trees themselves, since it transfers to any decision this catalog didn't happen to enumerate.

### 102.13 Exercises

1. Apply §102.5's decision tree to a real or hypothetical five-person team's application. Walk through each branch explicitly and state the resulting recommendation.
2. An interviewer asks, "would you use GraphQL here?" for a public API with a small, fixed number of well-known client types. Using §102.6, construct the response that correctly identifies GraphQL as unnecessary here, and explain what condition, if changed, would flip that recommendation.

---
