## 107. Engineering Heuristics & Rules of Thumb

### 107.1 Purpose: Fast, Approximate Judgment for When There's No Time for a Full Framework

Every checklist in §106 assumes time to work through it deliberately. Some situations — an incident in progress, a quick design conversation, an interview's live time pressure — don't afford that. This chapter collects short, memorable heuristics that compress this handbook's deeper lessons into a form usable in seconds, explicitly acknowledging that a heuristic is an approximation that can be wrong in a specific case, not a substitute for the full reasoning behind it.

### 107.2 On Diagnosis

**"Profile before you optimize, always."** (companion §54, §70.6) — guessing at a bottleneck wastes more time than the profiling step would have. **"A vague complaint deserves a specific question before an answer."** (companion §70.1's entire founding premise) — "it's slow" is not yet a diagnosable statement. **"If it's intermittent, look for a boundary condition or a race, not a general capacity issue."** (companion §102.2's p50-versus-p99 exercise) — general capacity problems are usually uniform, not intermittent.

### 107.3 On Caching

**"Cache the expensive thing that's asked for often, not the cheap thing that's asked for rarely."** (companion §74.2's exact hit-rate-versus-value distinction) — caching something that was never expensive to compute adds cost without benefit. **"TTL is a backstop, invalidation is the mechanism."** (companion §83.3's ADR-5) — don't rely on a TTL to do a write-invalidation's job.

### 107.4 On Concurrency and Async

**"If a workload is CPU-bound, async will not save you."** (companion §71.6) — this single check resolves most "async is slower than expected" confusion immediately. **"One synchronous call in an async function blocks everyone, not just that request."** (companion §12.2, §73.6) — the blast radius of a blocking call in async code is categorically worse than the same call in synchronous code.

### 107.5 On Reliability

**"A timeout you didn't set is a timeout you'll eventually pay for."** (companion §76.6) — the single most common root cause of a hung worker is a missing timeout, not a complex distributed-systems failure. **"Retries without backoff can turn a partial outage into a full one."** (companion §104.3's retry-storm case study) — retry logic is not unconditionally safe just because it "handles" failures. **"Never retry a non-idempotent operation without an idempotency key."** (companion §32.6, §99.5).

### 107.6 On Scaling

**"Scale the thing that's actually saturated, not the thing that's easiest to scale."** (companion §99.3, §102.3) — adding web instances against a saturated database makes the database's problem worse, not better. **"If two things scale differently, deploy them separately."** (companion §91.3's ADR-13) — forcing two independently-varying workloads into one deployable unit under-serves whichever one actually needs more capacity at a given moment.

### 107.7 On Data and Migrations

**"A migration's execution behavior matters as much as its final schema."** (companion §105.1) — a correct target schema reached via a table-locking migration is still an incident. **"If it's not tested against realistic data volume, assume it isn't tested."** (companion §99.6, §106.4) — an empty local database exercises none of the concerns that make migrations and queries actually risky at scale.

### 107.8 On Decision-Making Itself

**"State the tradeoff honestly, even for the option you're rejecting."** (companion §78.3's ADR discipline) — a decision justified only by its own strengths, without acknowledging its real costs, hasn't actually been reasoned through. **"Name the condition that would make you reverse this decision, at the time you make it, not after."** (companion §92.2's demonstrated payoff of doing exactly this) — this is the single habit this handbook's entire capstone was built to instill.

### 107.9 A Caution About Heuristics Themselves

Every heuristic in this chapter is a compression of a fuller argument made elsewhere in this handbook, and compressions lose information — a heuristic applied to a situation genuinely outside the conditions where it holds will give a confidently wrong answer faster than a careful analysis would have given a correct one. Use these for triage and quick judgment calls, but return to the full chapter behind any heuristic (each one is cross-referenced above) whenever the stakes of a specific decision justify the additional time.

### 107.10 Mini Lab

Pick three heuristics from this chapter and, for each, construct a specific, realistic scenario where following the heuristic literally would actually give the *wrong* answer — this exercise, deliberately searching for a heuristic's failure boundary, builds a sharper, more calibrated intuition for when to trust quick judgment and when a situation demands the fuller framework instead.

---
