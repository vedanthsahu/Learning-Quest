## 103. Interview Vocabulary Mapping: From Question to Concept

### 103.1 Purpose of This Final Chapter

Every pattern this Part has cataloged now needs one last piece of connective tissue: recognizing, the moment an interviewer states a problem in their own words, which of these named patterns and which earlier handbook chapters actually apply. This chapter is an index running in the opposite direction from everywhere else in this handbook — from *question* to *concept* — covering the handful of system design prompts asked most frequently in real interviews.

### 103.2 "How would you design a notification system?"

```
Core requirement: an event happens (a comment, a follow, a
price drop) and one or more users must be informed, across
possibly multiple channels (push, email, SMS), reliably,
without blocking the action that triggered it.

Maps to:
  Fan-Out / Pub-Sub (§97.2-97.3)   -- one event, many downstream
                                        channel-specific handlers
  Outbox Pattern (§41.2, §97.9)    -- reliably publish the
                                        triggering event atomically
                                        with the DB write that
                                        caused it
  Message Queue / Worker Pool
    (§11, §40, §84.4)               -- asynchronous delivery,
                                        decoupled from the
                                        triggering request
  Retry with Backoff + DLQ
    (§64.5, Part V §91.A/E)         -- handling a flaky downstream
                                        provider (an SMS gateway)
  Idempotent Receiver / Idempotency
    (§29.8, §97.9)                  -- preventing duplicate
                                        notifications on retry
  Backpressure (§51.5)              -- protecting the system
                                        during a notification
                                        storm (a viral post
                                        triggering millions of
                                        fan-out notifications)
```

### 103.3 "How would you design a URL shortener?"

```
Core requirement: map a long URL to a short code and redirect
reliably, at very high read (redirect) volume relative to
writes (new short URLs created).

Maps to:
  Estimation Methodology (§80.4)   -- start here: read/write
                                        ratio dominates every
                                        later decision
  Distributed ID Generation
    (§35.5)                         -- generating unique short
                                        codes without a single,
                                        contended counter
  Caching (§10, §39, cache-aside
    vs read-through, §99.2)         -- redirects are extremely
                                        read-heavy and highly
                                        cacheable
  Read Replicas (§34.2)             -- read-heavy load scaling
  Rate Limiting (§60.2, §99.3)      -- preventing abuse of the
                                        shortening endpoint itself
```

### 103.4 "How would you design a rate limiter?"

```
Core requirement: this question is frequently BOTH an HLD
question (where does it sit in the architecture) and an LLD
question (implement the actual algorithm).

Maps to:
  API Gateway placement (§42.2,
    §60.4)                          -- WHERE the limiter sits:
                                        before requests consume
                                        backend resources
  Token Bucket / Leaky Bucket /
    Sliding Window / Fixed Window
    (§60.2, §99.3)                  -- WHICH algorithm, and why,
                                        per §99.3's decision
                                        framework
  Distributed rate limiting via
    a shared store (Redis, §102.10) -- coordinating counts
                                        across multiple gateway
                                        instances, not just one
  Multi-Tenancy isolation (§60.3)   -- per-tenant, not just
                                        global, limits
```

### 103.5 "How would you design a news feed (like Loop's own feed)?"

```
Core requirement: show each user a personalized, roughly
chronological stream of content from accounts they follow, at
scale.

Maps to:
  Fan-Out on Write vs Fan-Out on
    Read (a specific named tradeoff
    this handbook derived without
    naming explicitly at §83-87)     -- precompute each
                                        follower's feed on every
                                        post (fast reads, expensive
                                        for high-follower-count
                                        accounts) versus compute
                                        the feed at read time by
                                        querying followed accounts
                                        directly (cheap writes,
                                        expensive reads) -- a
                                        HYBRID (fan-out on write
                                        for most users, fan-out on
                                        read for extremely
                                        high-follower "celebrity"
                                        accounts) is the standard,
                                        real-world answer, directly
                                        an application of the Hot
                                        Key mitigation principle
                                        (Part V §91.B) to this
                                        specific problem shape
  Caching (§10, §83.4)              -- feed results cached with
                                        short TTL
  CQRS (§41.4, §102.8)              -- write model (posts) versus
                                        read model (materialized
                                        feeds) genuinely differ
  Event-Driven Architecture (§96.1,
    §87.3)                          -- feed updates propagated
                                        asynchronously, exactly as
                                        Loop's own Stage 87
                                        transition demonstrated
```

### 103.6 "How would you design a chat/messaging application?"

```
Core requirement: real-time, bidirectional, ordered message
delivery between users, with delivery/read receipts and
offline message storage.

Maps to:
  WebSockets (§98.3)                -- the correct real-time
                                        mechanism here, given the
                                        genuine bidirectional
                                        requirement
  Sticky Sessions / connection-
    aware load balancing (§28.3,
    Part V §91.E)                    -- routing a user's
                                        long-lived connection
                                        consistently
  Message ordering per conversation
    (§40.3's partitioning-for-
    ordering principle)              -- partition by
                                        conversation ID, not by
                                        an unrelated key
  Guaranteed Delivery + Idempotent
    Receiver (§97.9)                 -- offline users' messages
                                        durably queued and
                                        delivered exactly once
                                        on reconnect
  Read Repair-style reconciliation
    concepts (§100.5, adapted)       -- syncing message state
                                        across a user's multiple
                                        devices
```

### 103.7 "How would you design a distributed cache (like a simplified Redis)?"

```
Core requirement: this is a request to design the internals of
a pattern you'd otherwise just USE off the shelf -- the
question is testing distributed-systems fundamentals directly.

Maps to:
  Consistent Hashing (§28.4)        -- distributing keys across
                                        cache nodes; minimal
                                        reassignment on scaling
  Replication (§8.2, §34)           -- durability/availability
                                        per cache node
  Eviction Policies (§39.2)         -- LRU/LFU/TTL
  Quorum reads/writes (§34.5)       -- if strong consistency
                                        across replicas is a
                                        stated requirement
  Gossip Protocol (§100.2)          -- cluster membership at
                                        scale, avoiding a
                                        centralized coordinator
                                        bottleneck
```

### 103.8 "How would you design a ride-sharing location/matching service?"

```
Core requirement: track many moving entities' locations in
real time and efficiently match nearby riders to drivers.

Maps to:
  Geo-Partitioning (§62.3)          -- partition location data
                                        by geographic cell, so
                                        matching queries stay
                                        local
  Vector/Spatial indexing concepts
    (§21.3-21.4, adapted to
    geospatial rather than semantic
    similarity)                      -- efficient "nearest
                                        drivers to this point"
                                        queries
  WebSockets or frequent short
    polling (§98.3)                  -- continuous location
                                        updates from moving
                                        clients
  Eventual Consistency (§37.5)      -- a driver's location being
                                        a few seconds stale is
                                        an accepted, deliberate
                                        tradeoff, not a bug
```

### 103.9 The General Skill This Chapter Is Actually Teaching

No interview question you'll actually face is guaranteed to be one of the seven above verbatim — the actual, transferable skill is the *mapping process* itself: state the core requirement in one sentence, identify its read/write ratio and consistency needs (§80.3), and then walk the pattern catalogs in this Part (§94-102) asking, for each candidate pattern, "does the specific problem this pattern solves actually appear in what I just stated?" A candidate who runs this process explicitly, out loud, is demonstrating exactly the reasoning discipline this entire handbook was built to teach — the pattern names in this Part are the vocabulary; the reasoning in Parts I-IV is the actual skill being evaluated.

### 103.10 Exercises

1. Pick a system design question not covered in §103.2-103.8 (e.g., "design a parking garage system" or "design an ad click-tracking system"). Run the mapping process from §103.9 yourself, and identify at least four named patterns from this Part that plausibly apply.
2. Revisit §103.5's news feed mapping and explain, using the Hot Key concept (Part V §91.B), why a hybrid fan-out strategy specifically protects against a single, extremely-high-follower-count account overwhelming a pure fan-out-on-write approach.

---

*This concludes Part VI. Combined with Parts I-V and the appendices that follow, the handbook now connects first-principles engineering reasoning to the complete, named vocabulary of classical design patterns, architectural styles, messaging patterns, API styles, scaling patterns, distributed systems patterns, deployment patterns, engineering decision frameworks, and interview-ready pattern recognition used across the software industry.*

---
