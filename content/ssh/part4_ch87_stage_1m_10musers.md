## 87. Stage 1M → 10M Users: Multi-Region Active-Passive, Global CDN, Event-Driven Core, Observability Platform

### 87.1 What Broke

At 10,000,000 users, Loop's growth has genuinely gone international — a large and growing fraction of users are now in regions physically distant from Loop's single, original deployment region, and this population reports (and, per §59.8's segmented-latency monitoring, measurably experiences) meaningfully worse performance than domestic users, precisely as §59.2's speed-of-light floor predicts. Separately, the content and social-graph services (§86.3) now call each other synchronously often enough, and deeply enough, that a slowdown in one has started measurably degrading the other — the early signs of the cascading-failure risk warned about in §11.1 and §64.4. Finally, the ad hoc collection of monitoring dashboards assembled incrementally since Stage 82 has become unwieldy and inconsistent across the now-several independent services, making cross-service incident diagnosis (§57) slow and difficult.

### 87.2 Why It Broke

The international latency problem is §59.2's physical floor, now finally binding because Loop's user distribution has finally crossed the threshold where it matters (§59.8's explicit "when is multi-region deployment justified" test). The service-coupling problem is the natural, foreseeable consequence of §86.4's acknowledged new risk ("the team must now build circuit breakers") not yet having been fully acted on — the risk was identified in the previous stage's retrospective but not yet mitigated, and it has now manifested as real, measured degradation, exactly the kind of technical debt this Part's ADR format is meant to make explicit and trackable rather than silently forgotten. The observability inconsistency is a direct consequence of §48.3's warning about instrumenting each service independently without a shared standard — Loop's services were each given monitoring incrementally, by different engineers, at different times, with no unifying framework.

### 87.3 Candidate Fixes, and What Was Chosen

**For international latency**: Loop adopts a **global CDN** (§59.4) for all cacheable content (images, static assets, and now also cacheable API responses like public profile pages) immediately, since this is the cheapest, fastest-to-deploy mitigation. For the core application itself, Loop adopts **multi-region active-passive** deployment (§52.4) — a second, full region is stood up, initially serving only as a low-latency read path for the geographically distant user population (via asynchronous cross-region replication, §63.2, of the read-heavy data) while all writes still route back to the original, single primary region. Full active-active (§52.4's harder, more expensive alternative) is explicitly deferred, since the majority of Loop's write volume still originates near the primary region, and the added multi-writer consistency engineering (§62.4) isn't yet justified by write traffic that doesn't yet demand it.

**For service coupling**: Loop invests, finally, in the circuit breakers and bulkheads flagged as needed in §86.4, and additionally moves several of the highest-volume synchronous inter-service calls to an event-driven model (§41.5) — specifically, feed updates, which previously required the social-graph service to synchronously call the content service on every new post, are converted to an asynchronous, event-driven flow using the outbox pattern (§41.2) to guarantee reliable event publication.

**For observability**: Loop adopts a unified observability platform built on OpenTelemetry (§48.3), instrumenting every service consistently and enabling, for the first time, genuine end-to-end distributed tracing (§48.4) across the full multi-service call path.

### 87.4 What These Fixes Made Possible, and What New Failure Modes They Introduced

The CDN and multi-region read path unlock dramatically improved international performance, but they also introduce Loop's first genuine instance of §37.5's eventual-consistency tradeoff in a user-visible way: a post created by a user in the primary region may take a brief, bounded time to appear via the secondary region's read replica for a distant follower — an accepted, deliberate tradeoff, explicitly weighed against the alternative (synchronous cross-region writes, rejected per §62.2's latency argument). The event-driven feed-update conversion unlocks resilience to content-service slowdowns no longer cascading into the social-graph service, but it also introduces the exact eventual-consistency and idempotent-consumer requirements from §40.2.1 and §41.3 for feed updates specifically — a user's feed may now lag very slightly behind their followed accounts' latest posts, a small, accepted cost for the much larger resilience benefit. The unified observability platform unlocks fast, consistent cross-service incident diagnosis, but it also introduces Loop's first real encounter with §71's cardinality and cost-of-telemetry concerns, now that telemetry volume spans many services at real scale.

### 87.5 Retrospective: Architecture Decision Record

```
ADR-007: Global CDN + multi-region active-passive read path;
circuit breakers/bulkheads plus event-driven feed updates;
unified OpenTelemetry-based observability platform

Context: International user latency now measurably degraded by
physical distance from the single primary region; synchronous
inter-service coupling causing cascading slowdowns; inconsistent,
per-service observability slowing incident diagnosis.

Decision: Deploy a global CDN and a secondary region serving
asynchronously-replicated reads only (writes remain
single-region); implement circuit breakers/bulkheads for
remaining synchronous calls and convert feed updates to an
event-driven, outbox-pattern-backed flow; adopt a unified,
OpenTelemetry-based observability platform across all services.

Alternatives considered:
  - Full active-active multi-region: deferred — write volume
    does not yet justify the added multi-writer consistency
    engineering cost (§62.4-62.5).

Consequence: Feed updates and cross-region reads now carry a
small, accepted staleness window. Observability platform
telemetry volume must now be actively managed for cost and
cardinality (§71) going forward.
```

### 87.6 Engineering Intuition for This Stage

> **How do I know active-passive, not active-active, is the right multi-region choice here?** Per §62.5's explicit guidance: check whether write traffic genuinely originates from multiple distant regions in significant volume — Loop's writes are still concentrated near the primary region, so active-passive captures most of the latency benefit at a fraction of active-active's engineering cost.
>
> **What's the lesson in the service-coupling problem having been predicted but not immediately fixed?** The ADR format itself (§80.5, item 5) is meant to surface exactly this kind of deferred risk explicitly, so it can be intentionally prioritized later rather than silently forgotten — and this stage shows what happens when a flagged risk is deprioritized for one stage too many.
>
> **When would full active-active become justified for Loop?** Per §62.7's exercise-style reasoning: once a substantial fraction of write traffic genuinely originates from the secondary region's user population, the latency cost of routing all writes back to the primary region would itself become the dominant, binding constraint — at which point active-active's added consistency engineering cost becomes worth paying.

### 87.7 Exercises

1. Using §87.3's reasoning, explain why Loop chose asynchronous cross-region replication for its new secondary region's read path rather than synchronous replication, and what specific user-visible behavior results from this choice.
2. The service-coupling problem in §87.1 was explicitly flagged as a risk in the previous stage's ADR (§86.4) but not addressed until it caused real degradation. Using the ADR format from §80.5, propose a process change that would help Loop's team prioritize previously-flagged risks before they cause measurable harm.

---
