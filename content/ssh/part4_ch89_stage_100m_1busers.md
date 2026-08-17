## 89. Stage 100M → 1B Users: Edge Compute, Custom Infrastructure, Extreme Cost Optimization, Planet-Scale Consensus

### 89.1 What Broke

At 1,000,000,000 users, Loop's cost structure — not any single technical failure — becomes the central, dominant engineering concern. A detailed cost breakdown (§78.3) reveals that, at this scale, the managed-service premiums (§43.4) Loop has paid for convenience at every previous stage now represent an enormous absolute sum, and several specific, extremely high-volume operations (feed generation, the global trending-content computation flagged as an accepted cross-region cost back in §88.3) are individually expensive enough to justify dedicated engineering investment that would have been unjustifiable overhead at any earlier stage. Separately, authentication latency — a small, previously-unremarkable cost on every single request — has become a measurable, aggregate contributor to global tail latency (§73.2's compounding fan-out effect), specifically because it sits on the critical path of essentially every request, multiplied across an almost incomprehensible request volume.

### 89.2 Why It Broke

Both problems are the direct, natural consequence of scale finally reaching the point where §68.4's "managed service premiums often dominate cost" observation and §73.2's tail-at-scale compounding effect stop being minor considerations and start being the primary, first-order engineering constraints. Nothing here is a "mistake" from any previous stage — every earlier decision (managed databases at Stage 81, a hosted CDN at Stage 87) was the correct, deliberate choice for its stage, per §13.5 and §68's own guidance. This stage is simply the point where the specific economics that justified those choices finally inverts for a specific, narrow set of extremely high-volume operations — not for everything, and identifying precisely *which* operations have crossed that threshold, rather than reflexively "optimizing everything," is itself the central engineering judgment call at this stage.

### 89.3 Candidate Fixes, and What Was Chosen

**For cost**: rather than a blanket move away from managed services, Loop performs a targeted analysis (§78.4's unit-economics discipline) identifying the small number of specific operations whose cost, at current volume, now justifies custom, self-built infrastructure — feed generation and trending-content computation are moved to custom-built, heavily-optimized infrastructure, deliberately engineered and tuned specifically for these two operations, while the large majority of Loop's other functionality remains on managed services, since their volume doesn't justify the same investment. This directly follows §13.6 and §68.7's guidance: self-hosting becomes justified specifically once "extreme, sustained scale where the managed service's premium becomes a large absolute cost" — a bar most of Loop's functionality still doesn't clear, even at this scale.

**For authentication latency**: Loop moves token verification (§30.3's short-lived JWT approach, already adopted at a smaller scale) to **edge compute** (§59.5) — since verifying an already-issued, short-lived token against a well-known public key requires no centralized, authoritative data lookup, this specific operation is a clean fit for edge execution, directly removing it from the critical, centralized path for the overwhelming majority of requests and directly addressing the compounding tail-latency effect from §73.2 at its most impactful point: the one operation that runs on literally every single request.

### 89.4 Planet-Scale Consensus: A Deliberate Non-Decision

It is worth stating explicitly, as a genuine engineering decision in its own right, what Loop does *not* do at this stage: it does not adopt a full, Spanner-class, globally-consistent consensus system for its core data, even now. The geo-partitioning approach from Stage 88 (§88.3), combined with the narrow, deliberately-accepted cross-region cost for the small set of genuinely-global operations, continues to meet Loop's actual requirements at this scale. This is included specifically to reinforce §62.5's central lesson one final time, at the very top of this Part's growth curve: even at a billion users, the most sophisticated available technology is not automatically the correct choice — the correct choice remains, as it has been at every single stage in this Part, the one justified by an actual, measured, current constraint.

### 89.5 What These Fixes Made Possible, and What New Failure Modes They Introduced

Targeted custom infrastructure for feed generation and trending content unlocks dramatic cost efficiency for Loop's two most expensive operations, but it also means Loop now owns and must operate genuinely novel, custom infrastructure (§58's hyperscale OS-level tuning concerns become directly relevant here, for the first time in this Part, specifically for these two custom systems) rather than relying entirely on a vendor's expertise — a real, ongoing operational burden accepted deliberately in exchange for the cost benefit. Edge-based token verification unlocks a measurable global tail-latency improvement, but it also means Loop's authentication system now has a distributed, edge-deployed component whose correctness (specifically, timely propagation of key rotation and revocation, directly echoing §61.3's token revocation tradeoff) must be managed across a globally-distributed footprint rather than a single, centralized service.

### 89.6 Retrospective: Architecture Decision Record

```
ADR-009: Targeted custom infrastructure for the highest-cost
operations (feed generation, trending content); edge-based
authentication token verification; explicit continued rejection
of planet-scale consensus infrastructure

Context: Detailed cost analysis revealed managed-service premiums
dominating spend for a small number of extremely high-volume
operations; authentication latency, present on every request,
became a measurable contributor to global tail latency at this
volume.

Decision: Move feed generation and trending-content computation
to custom, self-built infrastructure; move token verification to
edge compute; continue using geo-partitioning (not full NewSQL/
Spanner-class consensus) for core data.

Alternatives considered:
  - Blanket migration away from managed services: rejected —
    unit economics analysis (§78.4) showed most functionality's
    volume does not justify the operational cost of self-hosting.
  - Planet-scale consensus infrastructure: rejected again, for
    the same reasons established at Stage 88 (§88.3) — geo-
    partitioning continues to meet Loop's actual requirements.

Consequence: Loop now operates genuinely custom infrastructure
for two specific systems, with the operational burden that
implies. Edge-deployed authentication requires careful, timely
key-rotation propagation across a global footprint.
```

### 89.7 Engineering Intuition for This Stage

> **How do I know which specific operations justify custom infrastructure at this scale, rather than optimizing everything?** Per §78.4's unit economics: identify operations whose cost, measured per unit of business value, is both large in absolute terms and disproportionate relative to comparable operations — a small, specific set of extreme outliers, not a blanket judgment against managed services generally.
>
> **How do I know authentication latency has crossed the threshold where edge compute is justified?** Per §73.2 and §59.5: the operation sits on the critical path of essentially every request (maximizing the aggregate impact of even a small per-request improvement) and can be executed correctly using only local or cached data (satisfying edge compute's specific applicability requirement).
>
> **What is the single most important lesson this final stage reinforces?** That the discipline established in this Part's very first stage (§81's deliberately simple architecture, justified by honest estimation) is the same discipline that governs the very last one: match the architecture to the actual, current, measured constraint — never to the theoretical ceiling of what's technically possible.

### 89.8 Exercises

1. Using §89.3's unit-economics reasoning, propose a specific test you would apply to any operation in a large-scale system to determine whether it justifies custom infrastructure versus remaining on a managed service.
2. Reflecting on this Part as a whole, identify one architectural decision made at an early stage (§81-84) that was later revisited or replaced, and explain, using that stage's own ADR, why the original decision was nonetheless correct *for its time*.

---
