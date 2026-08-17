## 85. Stage 10,000 → 100,000 Users: Sharding Decision, Service Extraction, Async Workers, Rate Limiting

### 85.1 What Broke

At 100,000 users, three distinct pressures surface together. First, the primary database's write volume — driven mostly by posts, comments, and reactions — has grown to the point where the single primary's disk I/O is consistently near saturation during peak hours, and this time, unlike Stage 83's read-heavy feed problem, caching does not help, because these are writes, not repeated reads. Second, the engineering team has grown from two people to four, and the single shared codebase has started producing merge conflicts and accidental cross-feature breakage serious enough to slow releases — a distinctly organizational, not technical, symptom (§12.3). Third, a small number of automated scripts (bots) have discovered Loop's API and are hammering specific endpoints, degrading service for genuine users.

### 85.2 Why It Broke

The write-volume problem is a genuine capacity failure (§1.3.1) at the storage layer, and per §8.6's explicit guidance ("sharding becomes necessary once genuinely needed, not before"), this is the first point in Loop's history where that threshold has actually been reached — vertical scaling of the single write primary (§18.4) has a ceiling, exactly like the application tier's ceiling in §84, and unlike the application tier, a database's write path cannot be horizontally scaled by simply adding more identical, stateless instances (§18.5's statelessness argument doesn't apply to the data itself). The organizational friction is a direct, textbook instance of §12.3's "organizational pressure" case for splitting a monolith — and it's worth being explicit that this pressure, not any technical scaling need, is the actual justification here. The bot traffic is an unaddressed instance of §60.2's rate-limiting argument, now needed for the first time because Loop's API has, for the first time, attracted attention from parties other than its own frontend.

### 85.3 Candidate Fixes, and What Was Chosen

**For the write-volume problem**: Loop shards its posts and comments data by user ID (§35.2's hash-partitioning approach, chosen over range-partitioning specifically because Loop's write pattern has no natural, useful range-query access pattern to preserve, and hash partitioning's even distribution directly avoids the hot-shard risk that a poorly-chosen range scheme, like partitioning by signup date, would introduce as new users skew toward the newest, hottest range). This is treated with the full caution §35.4 and §63.3 recommend: a staged, dual-write, verified migration — not a single, risky cutover.

**For the organizational friction**: rather than a full microservices decomposition (rejected as premature — Loop has four engineers, not the dozens where §12.3's full organizational pressure typically justifies a large-scale split), a single, well-justified **service extraction** is performed: the notification system (already partially decoupled via the queue introduced in §84.4) is pulled into its own small service with its own deployment pipeline, specifically because it is the one component with a clean, already-proven boundary (§12.5's domain-driven design guidance) and its own distinct on-call and iteration needs.

**For the bot traffic**: rate limiting (§60.2) is added at the API gateway layer, using a token-bucket algorithm per API key/IP, directly containing the specific, identified abuse pattern without affecting genuine user traffic.

### 85.4 What These Fixes Made Possible, and What New Failure Modes They Introduced

Sharding unlocks write capacity well beyond what any single primary could provide — but it also introduces Loop's first genuinely hard cross-shard query problem: a small number of admin/moderation tools that need to query across all users' posts (rather than one user's own shard) now require a fan-out query across every shard (§35.2's explicit tradeoff), a real, accepted cost for the much larger benefit of unblocked write scaling. Service extraction unlocks independent deployment and on-call for the notification team, but it also introduces this handbook's first real instance of §4.3's contract-versioning discipline being genuinely necessary — the notification service now has external callers (the main application) that must be treated as a stable API, not an internal function call that can be refactored freely. Rate limiting successfully contains the bot traffic, but it also requires the team to now maintain a genuine, ongoing distinction between legitimate high-volume API users (who need a documented, sanctioned higher limit) and abusive ones — an ongoing operational classification problem, not a one-time fix.

### 85.5 Retrospective: Architecture Decision Record

```
ADR-005: Shard posts/comments by user ID; extract notification
service; add API rate limiting

Context: Write-volume ceiling reached on the single database
primary; organizational friction from a four-person team sharing
one codebase; unaddressed bot traffic degrading service quality.

Decision: Hash-shard posts/comments by user ID with staged,
verified migration; extract notifications into an independently
deployed service; add token-bucket rate limiting at the gateway.

Alternatives considered:
  - Full microservices decomposition: rejected as premature for
    a four-person team (§12.3) — only one clean, justified
    extraction was performed, not a wholesale split.
  - Range-partitioned sharding: rejected due to hot-shard risk
    from skewed access to newly-signed-up users (§35.2-35.3).

Consequence: Cross-shard admin/moderation queries are now
measurably more expensive (accepted cost). The notification
service's API is now a real, versioned contract, not refactorable
at will.
```

### 85.6 Engineering Intuition for This Stage

> **How do I know sharding is genuinely justified now, rather than premature?** The specific test from §8.6 and §35: is the actual, measured write throughput exceeding what a single, well-provisioned, vertically-scaled primary can sustain? Here, yes — this is the first stage where that specific test passes.
>
> **How do I know to extract exactly one service, not ten?** Per §12.5, extract along a boundary that is already clean and where cross-boundary calls are already rare — notifications qualify because of the queue-based decoupling already introduced in §84; most of the rest of Loop's logic does not yet have an equally clean boundary.
>
> **What would over-fixing the bot problem look like?** Building a full, custom anti-abuse machine-learning pipeline in response to a small number of scripted bots — a sophisticated response to a problem simple rate limiting (§60.2) already solves completely at this stage.

### 85.7 Exercises

1. An engineer proposes sharding by post-creation timestamp instead of user ID, reasoning that it would make retrieving "recent posts across all users" faster. Using §85.3 and §35.3, explain the hot-shard risk this specific choice introduces and why user-ID hash sharding was chosen instead.
2. Loop's four-person team is debating whether to fully decompose the application into eight microservices now. Using §85.3's reasoning and §12.3, write the argument for why only the notification service was extracted, and what specific evidence would justify further extraction later.

---
