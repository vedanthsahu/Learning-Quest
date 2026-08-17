## 86. Stage 100,000 → 1,000,000 Users: Microservices Split, Multi-AZ HA, CI/CD Maturity, On-Call Formalized

### 86.1 What Broke

At 1,000,000 users, Loop's engineering team has grown to roughly twenty people across several feature areas, and the "one well-justified extraction" approach from Stage 85 is no longer sufficient — nearly every team now steps on every other team's code changes in the shared core application, and release velocity (§46) has degraded noticeably, with deploys now bundling many unrelated teams' changes together and increasing the blast radius (§1.3.3) of any single team's mistake. Separately, a single, brief data-center-level infrastructure event (a single availability zone's networking degraded for twenty minutes) took down the entire application, because everything was still running in one availability zone (§74.2's multi-region concept applies here first at a smaller, single-region-multi-AZ scale). Finally, incidents are increasingly first noticed by users on social media before Loop's own team notices — there is no formal on-call rotation, and detection is inconsistent depending on who happens to be awake and paying attention.

### 86.2 Why It Broke

The release-velocity problem is §12.3's organizational pressure fully realized at a scale (twenty engineers, many feature teams) that Stage 85's single extraction was never meant to solve completely — this is now the point where a genuine, broader microservices decomposition (§12.5) is justified by real, measured pain, not anticipated pain. The availability-zone outage is a direct, textbook redundancy gap (§19.4, §52.4): Loop had implicitly assumed a single AZ's reliability was "good enough," an assumption that held right up until it didn't, and multi-AZ deployment — running redundant instances of every tier across multiple, independent physical availability zones within the same region — is the direct, standard mitigation. The detection problem is a scaled-up version of exactly the same gap identified back in §82.2, now recurring because informal, single-person monitoring (even "monitoring" now means several engineers loosely watching dashboards) has again stopped scaling, this time specifically for coordinated, off-hours incident response.

### 86.3 Candidate Fixes, and What Was Chosen

**For release velocity**: Loop performs a genuine, domain-driven decomposition (§12.5) into a small number of services aligned with team boundaries (§67.2's Conway's Law applied deliberately, not accidentally) — a "content" service (posts, comments), a "social graph" service (follows, feed generation), and the already-extracted notification service, each independently deployable, each owned by a specific team. This is accompanied by the first real investment in an API gateway (§42.2) and basic service-to-service contract discipline (§29.6), since these services now genuinely need to coordinate as independent, versioned components rather than function calls within one process.

**For availability**: Loop moves to a multi-AZ deployment for every tier — application servers, database (via synchronous or semi-synchronous same-region cross-AZ replication, §34.3, chosen over asynchronous specifically because cross-AZ latency within one region is low enough, per §63.2's cross-region-vs-cross-AZ latency distinction, that the synchronous cost is affordable), and cache.

**For detection**: a formal on-call rotation is established among the now-larger engineering team, with proper severity-based triage (§57.3) and symptom-based alerting (§57.2) replacing the previous ad hoc "whoever notices" approach.

### 86.4 What These Fixes Made Possible, and What New Failure Modes They Introduced

The microservices split unlocks independent team velocity — each team can now deploy on its own schedule — but it also reintroduces, for the first time at real severity, every distributed-systems concern from §9 and §12.4: a request that used to be one in-process function call between "post creation" and "feed update" logic is now a real network call, subject to partial failure, and the team must now build circuit breakers and bulkheads (§42.4-42.5) they never previously needed. Multi-AZ deployment unlocks survival of a single-AZ failure, but it also introduces real, ongoing cost (redundant capacity across AZs, essentially never fully idle) and a first, if modest, taste of the cross-AZ consistency and replication-lag considerations from §34.4. Formal on-call unlocks faster, more consistent detection, but it also introduces the alert-fatigue risk (§57.2) directly — the team must now calibrate alert thresholds carefully, or risk the exact "too many false alarms" failure mode that undermines on-call effectiveness.

### 86.5 Retrospective: Architecture Decision Record

```
ADR-006: Domain-driven microservices decomposition; multi-AZ
deployment for all tiers; formal on-call rotation

Context: Twenty-engineer team experiencing severe release
velocity degradation from a shared monolith; single-AZ outage
took down the entire application; incident detection was
informal and inconsistent.

Decision: Decompose into content, social-graph, and notification
services aligned with team ownership; deploy every tier
redundantly across multiple availability zones within the
region; establish a formal on-call rotation with severity-based
triage and symptom-based alerting.

Alternatives considered:
  - Continuing with a single, larger extraction (as in Stage 85):
    rejected — organizational pressure now spans far more of the
    codebase than one extraction can address.
  - Multi-region (not just multi-AZ) deployment: deferred —
    current traffic is concentrated in one geographic region, and
    the added complexity of multi-region isn't yet justified
    (§59.8, §62.7).

Consequence: The team now owns real distributed-systems
complexity (partial failure, contract versioning) that didn't
exist in the monolith. On-call alert thresholds require ongoing
calibration to avoid fatigue.
```

### 86.6 Engineering Intuition for This Stage

> **How do I know a broader microservices split is now justified, versus Stage 85's single extraction?** Compare the actual, measured release velocity and cross-team friction against team size and feature-area count — a single extraction addresses a single clean boundary; a broader split is justified once friction is diffuse across most of the codebase, as it is here.
>
> **How do I know multi-AZ, not yet multi-region, is the right redundancy investment?** Per §59.8's guidance: multi-region is justified by genuine geographic user distribution or regional-failure risk tolerance requirements; Loop's user base and risk profile at this stage justify only the smaller, cheaper step of multi-AZ redundancy within one region.
>
> **What would under-investing in on-call formalization look like?** Continuing to rely on ad hoc, "whoever's awake" detection at twenty engineers and a million users — a scale where user-reported, social-media-driven incident discovery is a serious, recurring reputational risk, not a rare inconvenience.

### 86.7 Exercises

1. A team member proposes going straight to multi-region deployment "to be safe," given the AZ outage. Using §86.3 and §59.8, explain why multi-AZ (not multi-region) is the appropriate response at this specific stage, and what would need to be true for multi-region to become justified.
2. Explain, using §86.4, why splitting "post creation" and "feed update" logic into separate services reintroduces correctness concerns (specifically around partial failure) that never existed when this logic ran in a single process, and name the two specific resilience patterns (from §42) that directly address this.

---
