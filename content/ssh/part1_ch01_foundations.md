# PART I — PASS 1: MENTAL MODELS

## 1. Foundations: Why Systems Fail and What Engineering Judgment Means

### 1.1 What a "System" Is, and Why the Word Matters

A program is something that runs. A **software system** is something that runs, keeps running while its inputs and load change, keeps running while individual parts of it fail, and can be changed by a team of people over years without anyone fully holding it in their head at once.

That definition is doing real work. Notice what it does *not* say: it does not say "a system is a program plus a database" or "a system is microservices." Those are implementation choices that may or may not appear in a given system. What is definitional is the presence of three pressures that a single-user script never has to face:

- **Time pressure**: the system must still be correct after the input distribution, the data volume, and the user count have all changed by orders of magnitude from whatever they were when it was first written.
- **Failure pressure**: some component — a disk, a network link, a process, a person deploying a change — will fail while the system is in the middle of doing something, and the system must have an opinion about what happens next.
- **Change pressure**: the system will be modified by people who did not write the original code, under time constraints, without being able to re-verify every interaction by hand.

Everything in this handbook is, ultimately, a technique for surviving one of these three pressures. Caching, sharding, and horizontal scaling answer time pressure. Replication, retries, circuit breakers, and consensus answer failure pressure. API contracts, service boundaries, and CI/CD answer change pressure. When you are evaluating an unfamiliar pattern later in this book and are not sure why it exists, ask which of these three pressures it is a response to — it is always at least one of them.

### 1.2 Historical Motivation: Why This Discipline Exists

In the earliest era of commercial computing, "the system" and "the machine" were the same noun. A program that outgrew its machine was rewritten for a bigger machine. Failure meant the machine was down, full stop, and there was no engineering discipline required beyond "buy more reliable hardware" and "back up the tape."

Three shifts broke that world, and each one directly produced a body of engineering knowledge that this handbook covers:

1. **Networks connected machines**, which meant a system was no longer a single point of failure or a single unit of scaling — but also meant a whole new failure category appeared (the network itself can be slow, partitioned, or lossy, independent of any machine being "up"). This produced distributed systems theory (Part I §9, Part II §36–38).
2. **Demand outgrew any single machine's capacity**, first for storage, then for compute, then for network bandwidth — which produced replication, sharding, caching, and horizontal scaling as a discipline (Part I §8, §10; Part II §34–35, §39).
3. **Organizations outgrew a single team's ability to hold the whole system in their heads**, which produced service boundaries, API contracts, and the entire discipline of platform/infrastructure engineering — CI/CD, observability, and the operational tooling that lets many teams change one system without coordinating every change by hand (Part I §12, §15–16; Part II §42, §46–48).

Every technology named later in this book is downstream of one of these three shifts. If a chapter introduces something and you cannot connect it to "networks connect machines," "demand outgrew one machine," or "organizations outgrew one team," flag it — the chapter has skipped a step.

### 1.3 Why Systems Fail: A Taxonomy

Production failures are not a random grab-bag; they cluster into a small number of categories, and recognizing which category you are in is most of the work of debugging.

#### 1.3.1 Failures of Capacity

The system receives more of something — requests, data, connections, concurrent users — than some component was sized to handle. This is the *slow* failure family: nothing is "broken," every component is doing exactly what it was built to do, and the system still falls over, because a queue somewhere fills up faster than it drains. Connection pool exhaustion, thread pool starvation, and disk-full conditions are all capacity failures. The signature symptom is that the system was fine yesterday and fine an hour ago, and degrades as some load metric crosses a threshold nobody had explicitly reasoned about.

#### 1.3.2 Failures of Coordination

Two or more components disagree about the state of the world, or about whose turn it is to act. A double-charged payment because two retries both succeeded, a **split-brain** where two nodes both believe they are the leader, a deadlock where two transactions each wait on a lock the other holds — these are coordination failures. They are the hardest category to reproduce, because they typically require a specific interleaving of events across independent components, and that interleaving may occur once in ten million requests. Part II §36–38 and the terminology encyclopedia (Part V §91.C) are almost entirely about this category.

#### 1.3.3 Failures of Dependency

A component fails not because of anything wrong with it, but because something it depends on failed, and the failure was not contained. This is **cascading failure**: a single slow downstream database causes every upstream service calling it to pile up waiting threads, which exhausts those services' thread pools, which makes *them* slow to everything that calls *them*, and the failure propagates outward until an isolated problem in one component has taken down the whole system. Circuit breakers, bulkheads, timeouts, and backpressure (Part II §41–42, Part V §91.D) exist specifically to contain this category.

#### 1.3.4 Failures of Assumption

The system was built correctly against a set of assumptions that later became false, silently. "Users are in one timezone." "IDs fit in 32 bits." "The list of categories never grows past 50." "This job finishes in under a minute." None of these were wrong when written. Each one, once falsified by growth, produces a failure that looks like a bug but is really an expired assumption. Because the code has not changed, these failures are often blamed on "something else" for a long time before anyone re-examines the original assumption.

#### 1.3.5 Failures of Human Process

Someone deployed a config change at the wrong time, a runbook was out of date, an alert was routed to nobody, an on-call engineer restarted the wrong service. These are frequently the *proximate* cause logged in an incident report, but a mature postmortem culture (Part II §57, Part III §79) treats the human action as a trigger, not a root cause — the root cause is almost always that the system made the correct action non-obvious, or made the incorrect action too easy.

> Cross-reference: this taxonomy recurs, with mechanism-level detail, throughout Pass 2, and with real incident case studies throughout Pass 3.

### 1.4 The Three Resources Almost Everything Contends For

A useful simplification, when you are new to systems thinking, is that nearly every failure and nearly every scaling decision in this handbook ultimately traces back to contention over exactly three resources:

```
COMPUTE     — CPU time, or more precisely, scheduler attention
STORAGE     — durable bytes, and the I/O bandwidth to read/write them
NETWORK     — bytes in flight between processes, and the latency to move them
```

Memory is worth calling out separately in practice, but structurally it behaves like a fourth, faster tier of storage with its own contention dynamics. When you encounter an unfamiliar production problem, a fast first diagnostic move is to ask which of these three (or four) resources is saturated, because the fix almost always follows from the answer:

- Compute-bound → add compute (vertical/horizontal scaling, §18), or do less work per request (caching, §10; batching, §51).
- Storage I/O–bound → change the access pattern (indexing, §31; caching, §39) or spread the I/O across more disks/machines (sharding, §35; replication, §34).
- Network-bound → reduce the number of round trips (batching, connection reuse), reduce payload size, or move the data closer to where it's consumed (CDN/edge, §59).

This simplification will be revisited and complicated throughout the book (real production systems are rarely bound by only one resource, and the bottleneck moves as you fix things — see §1.6), but it is a genuinely useful first-pass lens and you should have it available before anything else in this handbook makes sense.

### 1.5 What "Engineering Judgment" Actually Means

A junior engineer, shown a problem, tends to ask "what is the correct solution?" A senior engineer asks "what are the two or three plausible solutions, what does each one cost, and which cost is this organization, at this scale, actually able to afford right now?" That reframing — from *correctness* to *cost-aware choice among valid alternatives* — is what this handbook means by engineering judgment, and it is the explicit target of Part IV.

Every nontrivial engineering decision in a real system is a tradeoff, not a solution. "Should we shard the database?" does not have a correct answer independent of context — sharding trades query simplicity and cross-row transactional guarantees for the ability to scale writes past one machine. The *right* engineering answer is always of the form: "given that we are at N requests/second, with M rows, and a team of size K, sharding costs us X and buys us Y, and given our actual constraints, X is or is not worth paying yet." A large fraction of poor production architectures are not the result of an engineer choosing the "wrong" technology — they are the result of an engineer choosing the objectively more sophisticated technology *before* the constraint that justifies its cost actually existed.

This produces the single most load-bearing habit this handbook is trying to teach: **before adopting any pattern described in this book, be able to state, in one sentence, the specific metric or symptom that indicates you need it now** — not eventually, not "at scale" in the abstract, but now, for you. That habit is formalized as the Engineering Intuition block that closes every chapter (§0.1.2), and it is the entire subject matter of Part IV.

### 1.6 The Bottleneck Always Moves

A corollary that will save you a great deal of wasted effort: fixing the current bottleneck in a system does not make the system fast — it reveals the *next* bottleneck. A database that was slow because of an unindexed query, once indexed, will push load into the application's connection pool. A connection pool that is enlarged will push load into the database's ability to execute concurrent queries. A database that is now vertically scaled will eventually push load into the network link between the app tier and the database. This is not a sign of a badly-built system; it is the normal shape of scaling any real system, and it is why Part IV walks through *ten* distinct stages rather than jumping straight to a "final" architecture — there is no final architecture, only the next bottleneck.

### 1.7 A First Look at Tradeoff Thinking: The Shape of Things to Come

Later chapters formalize specific tradeoff frameworks — most famously **CAP** and **PACELC** for distributed data (§9, §38), but the same *shape* of tradeoff recurs everywhere in this book, and it is worth seeing the shape once, generically, before it reappears wearing a dozen different names:

```
                    You cannot maximize both.
                    ┌─────────────────┐
     Property A  ───┤   pick a point   ├─── Property B
                    │   on this line   │
                    └─────────────────┘

  Examples that all share this shape, previewed here and
  developed fully in later chapters:

    Consistency          <──────────>   Availability      (§9, §38)
    Latency              <──────────>   Throughput        (§50)
    Strong isolation     <──────────>   Concurrency        (§32)
    Normalization        <──────────>   Read performance   (§7, §33)
    Flexibility (micro-  <──────────>   Operational
      services)                          simplicity (mono) (§12, §42)
    Cost                 <──────────>   Redundancy/HA      (§74, §78)
```

Whenever this handbook introduces a named tradeoff, the correct reading is never "which side is better" — it is "where on this line does *this* system, under *these* constraints, need to sit, and what would have to change about the constraints for the right point on the line to move."

### 1.8 Engineering Intuition

> **How do I know I need the mindset in this chapter, specifically?** If you notice yourself reaching for a technology name before you can state the metric that justifies it, or if a design review answer is "because it's best practice" rather than "because we measured X," that is the signal this chapter is addressing.
>
> **What symptoms indicate systems-thinking is missing on a team?** Incidents whose postmortems blame a person rather than a missing safeguard; architecture chosen to match a resume rather than a load profile; scaling decisions made once and never revisited as load changes.
>
> **What metrics indicate it?** None directly — this chapter is the lens you use to decide *which* metrics matter later. Its "metric" is whether you can, for any pattern in this book, name the failure it prevents.
>
> **What breaks first if this chapter's mindset is ignored?** Nothing, at first — over-engineering and under-engineering both look identical to "system works" until the specific pressure (time, failure, or change — §1.1) that the missing judgment would have anticipated actually arrives, at which point the fix is far more expensive than it would have been if planned for.
>
> **When should you *not* apply heavyweight systems thinking?** When the system genuinely is a script, run by one person, with no path to needing to survive the three pressures in §1.1 — e.g., a one-off data migration script does not need a circuit breaker.
>
> **What would a hyperscale company do?** Maintain formal capacity models, load-test before every major launch, and require an Architecture Decision Record (§90) justifying any new heavyweight pattern with a named metric, not an anticipated one.
>
> **What would a two-person startup do?** Deliberately under-build, and treat that as correct engineering judgment rather than a shortcut — see Part IV, Stage 0 (§81), where "one server, one database" is the *correct* architecture, not a placeholder for a "real" one.
>
> **What changes at 100 / 1,000 / 100,000 / 1,000,000 / 100,000,000 users?** This progression is not answered in the abstract — it is the entire content of Part IV (§80–90), which exists precisely because the honest answer to "what should I build" is "it depends on which of these you actually are."

### 1.9 Exercises

1. Take a system you have personally built or maintained. For its single worst production incident, classify it against the five-category taxonomy in §1.3. Was the category obvious at the time, or did it take investigation to find?
2. For the same system, name the current bottleneck resource among compute, storage, and network (§1.4). If you fixed it today, argue for what the *next* bottleneck would be (§1.6).
3. Find one technology in your current stack that you cannot justify with a specific metric. Write the one sentence that *would* justify it, and then check whether that metric is actually true for your system today.

### 1.10 Further Reading

- Jim Gray, "Why Do Computers Stop and What Can Be Done About It?" (1985) — the founding taxonomy-of-failure paper; much of §1.3 is a modern restatement of its concerns.
- Richard Cook, "How Complex Systems Fail" — a short, dense treatment of why failure is a property of the system, not a single faulty part or person.
- Google, *Site Reliability Engineering* (the "SRE book"), Chapter 1 — an industrial articulation of the tradeoff-thinking framing in §1.5, from the organization that popularized much of the vocabulary this handbook uses.

---
