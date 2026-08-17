## 105. Additional HLD Worked Examples: Parking Garage, Ad Click-Tracking, Distributed Job Scheduler, Payment System

### 105.1 Purpose: Extending §103's Index to Less-Common but Frequently-Asked Prompts

§103 mapped seven of the most common system design prompts to this handbook's pattern catalog. This chapter extends that same mapping process (§103.9) to four more prompts that appear regularly in real interviews but weren't covered — chosen specifically because each exercises a different part of the pattern catalog than §103's seven, broadening the transferable mapping skill rather than just adding more examples of the same underlying shape.

### 105.2 "Design a Parking Garage Management System"

```
Core requirement: track available spots across multiple levels/
sections, assign a spot on entry, compute a fee on exit, handle
different vehicle sizes. Notably LOW-SCALE relative to most
interview prompts -- a useful test of whether a candidate
over-engineers when scale doesn't demand it (§1.5).

Maps to:
  Capacity estimation (§80.4)       -- explicitly small numbers
                                        here (hundreds of spots,
                                        not millions of requests)
                                        should visibly change the
                                        proposed architecture --
                                        a single well-designed
                                        relational database (§7)
                                        is very likely sufficient;
                                        proposing sharding or a
                                        message queue for this
                                        scale is a direct
                                        over-engineering tell.
  Strong data modeling (§6-7)       -- entities (Spot, Level,
                                        Vehicle, Ticket) and their
                                        relationships matter more
                                        here than infrastructure
                                        choices, since the core
                                        difficulty is domain
                                        modeling, not scale.
  Concurrency control (§32)         -- two vehicles arriving
                                        simultaneously must not be
                                        assigned the same spot --
                                        a transactional row-lock
                                        or optimistic-concurrency
                                        check (§32.3) is the
                                        correct mechanism, not a
                                        distributed lock (§36) --
                                        this scale doesn't need one.
  This question is testing: LLD-adjacent domain modeling and
  correct concurrency handling at SMALL scale, more than HLD
  infrastructure breadth -- recognizing when NOT to reach for
  distributed-systems machinery (§104.4) is the actual signal.
```

### 105.3 "Design an Ad Click-Tracking System"

```
Core requirement: record an extremely high volume of click
events with low latency, support later aggregation/analytics
(click counts per ad/campaign) without losing events, and
tolerate eventual (not necessarily immediate) consistency for
analytics.

Maps to:
  Write-heavy capacity estimation
    (§80.4)                          -- click volume, not read
                                        volume, dominates -- the
                                        opposite profile from
                                        §103.3's URL shortener,
                                        worth stating explicitly.
  Message Queue / Event Streaming
    (§11, §40, §66)                  -- absorb write bursts and
                                        decouple ingestion from
                                        aggregation; Kafka-style
                                        log-based streaming (§40)
                                        specifically, given the
                                        need to replay/reprocess
                                        for analytics correctness.
  Batch/Stream Processing (§20, §53) -- aggregation pipeline
                                        (click counts, unique
                                        users) computed via a
                                        streaming framework, not
                                        synchronously per click.
  Idempotency / Exactly-Once
    Semantics (§53.5, Part V §91.E)  -- a duplicate click event
                                        (from a retry or a
                                        double-fire client bug)
                                        must not double-count --
                                        critical for ad-billing
                                        accuracy specifically.
  Eventual Consistency (§37.5)       -- aggregated counts lagging
                                        by seconds-to-minutes is
                                        an accepted, deliberate
                                        tradeoff for this system,
                                        not a defect to eliminate.
  This question is testing: write-heavy pipeline design and
  correctness-under-duplication reasoning -- a candidate proposing
  a synchronous, strongly-consistent write path for every click
  has missed the core throughput/correctness tradeoff this
  question exists to probe.
```

### 105.4 "Design a Distributed Job Scheduler"

```
Core requirement: schedule jobs (one-time or recurring) for
execution at a specified time or interval, across a fleet of
worker machines, ensuring a job runs at most/exactly once even
if the scheduler or a worker fails mid-execution.

Maps to:
  Leader Election / Coordination
    (§36, Part V §91.C)              -- avoiding multiple
                                        scheduler instances all
                                        believing they're
                                        responsible for firing the
                                        same job simultaneously.
  Distributed Locks / Leases (§36.5,
    Part V §91.C)                     -- a worker claims a job
                                        with a time-bound lease so
                                        that if it crashes
                                        mid-execution, the lease
                                        expires and another worker
                                        can safely retry.
  Idempotent Job Execution (§29.8,
    §97.9)                            -- jobs must be safely
                                        re-runnable, since "exactly
                                        once" execution is
                                        extremely difficult to
                                        guarantee end-to-end
                                        (§53.5's exactly-once
                                        semantics discussion
                                        applies directly) --
                                        "at-least-once execution
                                        of an idempotent job" is
                                        the standard, honest
                                        real-world answer.
  Priority Queue / Delayed Queue
    (§97.4-97.5)                       -- scheduling jobs for
                                        future execution and
                                        prioritizing time-sensitive
                                        ones.
  Dead Letter Queue (Part V §91.E)    -- jobs that repeatedly fail
                                        execution are routed aside
                                        for investigation rather
                                        than retried forever.
  This question is testing: distributed coordination correctness
  under partial failure -- a candidate who proposes "exactly once"
  as an achievable, simple guarantee without qualification has
  missed the core distributed-systems subtlety (§37, §53.5) this
  question exists to probe.
```

### 105.5 "Design a Payment Processing System"

```
Core requirement: process payments reliably with STRONG
consistency and correctness guarantees (money must never be
lost, double-charged, or duplicated), integrate with external
payment providers, and maintain a complete, auditable transaction
history.

Maps to:
  ACID Transactions (§32.2)          -- unlike most of this
                                        chapter's other examples,
                                        strong consistency is
                                        NON-NEGOTIABLE here for the
                                        core ledger -- explicitly
                                        stating this upfront (as a
                                        Step 2 non-functional
                                        requirement, §92.2)
                                        justifies every subsequent
                                        decision.
  Outbox Pattern (§41.2, §97.9)      -- atomically recording "the
                                        payment was processed" in
                                        the database together with
                                        publishing an event
                                        (notify other services),
                                        avoiding the dual-write
                                        problem where one succeeds
                                        and the other fails.
  Idempotency Keys (§29.8)           -- a client retrying a
                                        payment request (due to a
                                        timeout, not knowing if the
                                        first attempt succeeded)
                                        must not cause a duplicate
                                        charge -- the idempotency
                                        key is the standard,
                                        industry-recognized
                                        mechanism.
  Saga Pattern (§41.5, §102.8)       -- a multi-step payment flow
                                        spanning multiple services
                                        (reserve funds, charge
                                        card, update ledger, notify
                                        user) needs a coordinated
                                        rollback strategy if any
                                        step fails partway through.
  Audit Logging / Event Sourcing
    (§41.6)                           -- every state change
                                        recorded immutably,
                                        supporting later dispute
                                        resolution and regulatory
                                        compliance.
  This question is testing: correctness-under-failure reasoning
  in a domain where "eventually consistent" is the WRONG default
  answer for the core ledger, even though it's the right default
  for many other systems in this chapter -- recognizing which
  systems genuinely need strong consistency (§38's CAP tradeoffs)
  is the central signal.
```

### 105.6 The Pattern Across These Four Examples

Notice the deliberate scale and consistency-requirement spread across this chapter's four examples: the Parking Garage (§105.2) is low-scale with light consistency needs; Ad Click-Tracking (§105.3) is extremely high-scale with relaxed consistency; the Job Scheduler (§105.4) is moderate-scale with subtle exactly-once semantics; Payment Processing (§105.5) is moderate-scale with maximum consistency requirements. A candidate who applies the *same* architecture template to all four has missed that non-functional requirements (§92.2 Step 2), not functional similarity, are what should drive the architecture — directly this handbook's repeated lesson that two systems with similar-sounding functional requirements can have entirely different correct architectures once their actual constraints differ.

### 105.7 Engineering Intuition

> **Why does the Parking Garage example explicitly warn against distributed-systems machinery?** Because interview candidates, having studied high-scale systems extensively, frequently over-apply that knowledge to low-scale questions — recognizing when a single database and a row lock is the *correct*, not merely acceptable, answer is itself a mark of seniority (§104.2's Signal 3, applied in the "don't add a box" direction).

> **What's the fastest way to tell whether a new, unfamiliar prompt needs strong or eventual consistency?** Ask "what happens if two conflicting writes are both accepted, and can that be reconciled after the fact?" — if reconciliation is impossible or unacceptable (money, physical spot assignment), strong consistency is required; if reconciliation is possible or the business tolerates brief staleness (click counts, feed content), eventual consistency is the more scalable, correct default (§38, §105.3 vs. §105.5's direct contrast).

### 105.8 Further Reading

- §103 (the original seven worked examples this chapter extends), §38 (CAP/PACELC), §41 (Event-Driven Patterns), §53.5 (Exactly-Once Semantics) — the direct mechanism foundations for this chapter's four examples.

---
