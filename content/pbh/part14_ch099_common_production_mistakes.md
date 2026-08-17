## 99. Common Production Mistakes

### 99.1 Purpose: From Code-Level Traps to Systemic Mistakes

§98 covered bugs visible in a single function's code. This chapter covers mistakes that are individually-correct-looking *decisions* — each one might be entirely reasonable in isolation — that combine into a genuine production risk, usually only visible at the level of an entire service or team practice rather than a single code review.

### 99.2 No Timeout Is Treated as "Good Enough for Now"

Shipping a first version of an external-call integration without an explicit timeout, intending to "add it later once things are stable," is the single most common systemic mistake this handbook's own Part XII repeatedly traces incidents back to (companion §76.6's stated dominant root cause for hung workers) — because "later" reliably never arrives until the missing timeout causes an actual incident, at which point it's fixed reactively rather than proactively. **The fix, as a team practice, not just a code fix**: make an explicit timeout a required field in code review for any new external call, with no "add it later" exception permitted.

### 99.3 Scaling the Web Tier When the Database Is the Actual Bottleneck

Adding more application instances in response to a slowness complaint, without first confirming where the actual bottleneck is (companion §70.6's profiling-first discipline), is a common, expensive mistake — more web instances competing for the same, already-saturated database connection pool (companion §72) doesn't just fail to help, it can worsen the problem by increasing total connection demand against unchanged database capacity. **The fix**: always profile or trace (companion §54, §65.5) before scaling any tier, confirming which specific component is actually saturated.

### 99.4 Treating a Migration as Optional Once "The Feature Works Locally"

Shipping a schema change without a proper, reversible migration (companion §28's Alembic discipline) because "it works when I run it on my local database" is a mistake that surfaces specifically in production, when the migration must run against real data at real volume, under real concurrent access, with a real requirement to not lose existing data — none of which a fresh local database exercises. **The fix**: every schema change goes through the same migration tooling and review, with no "small enough to skip it" exception, echoing companion §28.6's zero-downtime discipline.

### 99.5 Assuming Retries Are Always Safe

Adding automatic retries to a failing operation without checking whether that operation is idempotent (companion §32.6) is a mistake that converts a single failure into a duplicate side effect (a duplicate charge, a duplicate notification, companion §86.7's exact incident shape) — retries are a correctness-neutral improvement only for genuinely idempotent operations, and a correctness *regression* for anything else. **The fix**: audit every retried operation for idempotency explicitly before adding retry logic, never assume it by default.

### 99.6 Skipping Load Testing Because "It Worked Fine in the Demo"

Validating a new system only under the light, artificial traffic of a demo or manual testing session, then discovering its actual behavior under realistic concurrent load only once it's already in production, is a mistake this handbook's Part VIII (companion §52.4's Locust-based load testing) exists specifically to prevent — a system's correctness under one request at a time says almost nothing about its correctness or performance under a hundred concurrent ones. **The fix**: a load test against realistic, estimated production traffic is a required step before any new system's initial launch, not an optional one reserved for systems that "seem like they'll need it."

### 99.7 Letting Observability Lag Behind Feature Development Indefinitely

Continuously deferring observability work in favor of new features, on the theory that it can always be "added once things stabilize," is the exact systemic mistake this handbook's own capstone (companion §90.3's ADR-12) named explicitly and then corrected in a dedicated stage — the retrospective cost of that deferral (§90.5's largest-blast-radius retrofit in the entire capstone) is the concrete, worked illustration of why this mistake compounds the longer it continues, rather than staying a fixed, one-time cost.

### 99.8 Treating a Single Successful Deployment as Proof the Rollback Path Works

Assuming a rollback mechanism works because the *forward* deployment has always succeeded, without ever actually exercising the rollback path itself, is a mistake that surfaces at the worst possible time — during a genuine incident, when the rollback is needed for the first time and turns out to be broken (companion §69.5's exact "a checklist item true at launch silently becomes false" failure mode). **The fix**: periodically, deliberately rehearse a rollback in a non-production environment, treating it as a tested capability, not an assumed one.

### 99.9 Mini Lab

For each of this chapter's eight mistakes, identify whether your own current project (or the Fieldnote capstone, §79-91) has an explicit, active safeguard against it (a code-review rule, an automated check, a scheduled rehearsal) or is currently relying on informal discipline alone — informal discipline is precisely what erodes first under deadline pressure, and this audit is the concrete first step toward converting each safeguard into something structural rather than merely habitual.

---
