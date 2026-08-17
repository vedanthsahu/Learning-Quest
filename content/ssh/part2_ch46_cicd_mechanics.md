## 46. CI/CD Mechanics: Build Pipelines, Artifact Promotion, Deployment Strategies

### 46.1 What This Chapter Adds to §15

§15 established why manual release steps are risky and why CI/CD replaces them with automation. This chapter covers the concrete stages a build pipeline runs through, how a single build artifact is promoted through environments, and the specific deployment strategies (blue-green, canary, rolling) that reduce the risk of any single release.

### 46.2 The Build Pipeline: From Commit to Deployable Artifact

A CI/CD pipeline is a sequence of automated stages a code change passes through, each acting as a gate the change must pass before proceeding: compile/build, run automated tests (unit, integration, sometimes end-to-end), perform static analysis and security scanning, and finally package the result into a **build artifact** — a container image (§44.4), a compiled binary, or a deployable package — that is the single, immutable thing that will actually be deployed. The critical engineering principle here is **build once, deploy many times**: the exact same artifact that passed every test should be the one promoted through each subsequent environment (§46.3), never rebuilt from source again along the way — rebuilding separately for each environment reintroduces the possibility that two nominally "the same" deployments actually differ subtly (a different dependency version resolved, a different compiler flag applied), defeating the whole point of validating a specific artifact.

### 46.3 Artifact Promotion: The Same Artifact, Increasing Confidence

Rather than deploying a fresh build directly to production, mature pipelines **promote** the single validated artifact from §46.2 through a sequence of environments of increasing similarity to production — commonly a staging or pre-production environment first — running additional checks at each stage (broader integration tests, manual QA, performance testing) before the artifact is finally promoted to production. This staged promotion exists specifically to catch problems in an environment where they're cheap to discover, before they reach the environment where they're expensive (user-facing production incidents, §24). The direct engineering discipline this requires: every environment in the promotion chain should be as similar to production as practical (same artifact, same configuration mechanism, ideally the same infrastructure-as-code templates, §15.4) — a staging environment that differs significantly from production in ways that matter provides false confidence, catching problems that don't matter in production while missing ones that do.

### 46.4 Deployment Strategies: Reducing the Blast Radius of a Bad Release

Even a well-tested artifact can behave unexpectedly under real production traffic and data, which is exactly why *how* a new version is rolled out to production matters as much as the testing that preceded it — connecting directly to the blast-radius concept from §1.3.3, now applied specifically to the moment of deployment itself.

- **Rolling deployment**: gradually replace old-version instances with new-version instances, a few at a time, rather than all at once — if the new version is broken, only a fraction of capacity is affected at any moment, and the rollout can be paused. This is the default strategy a Kubernetes Deployment controller implements (§45.4).
- **Blue-green deployment**: run two complete, identical production environments ("blue," the current live version, and "green," the new version), fully deploy and verify the new version in the idle environment, then switch all traffic over in one atomic cutover — enabling instant, complete rollback (switch traffic back to blue) if a problem appears, at the cost of running two full production environments simultaneously during the transition.
- **Canary deployment**: route a small, deliberately limited percentage of real production traffic to the new version while the vast majority continues to the old, stable version, closely monitoring the canary's error rates and latency (§16.3) before gradually increasing its traffic share — directly limiting the blast radius of a bad release to whatever small fraction of users happened to be routed to the canary, at the cost of requiring careful traffic-splitting infrastructure and a clear, automated (or disciplined manual) decision process for when to proceed versus roll back.

```
Canary deployment traffic split over time:

  T=0:    99% -> old version   1% -> new version (canary)
                                     |
                          monitor canary's error rate/latency
                                     |
  T=1:    90% -> old version  10% -> new version  (if canary looks healthy)
  T=2:    50% -> old version  50% -> new version
  T=3:     0% -> old version 100% -> new version  (fully rolled out)

  At ANY point, if the canary's metrics degrade, route 100%
  back to the old version immediately -- only the canary's
  small traffic share was ever exposed to the problem.
```

### 46.5 Feature Flags: Decoupling Deployment From Release

A further refinement separates two ideas that are easy to conflate: **deploying** code (making it present and running in production) and **releasing** a feature (making it actually active/visible to users). A **feature flag** wraps new functionality in a runtime-checked condition, allowing the containing code to be deployed to production (fully tested, fully promoted per §46.3) while the feature itself remains inactive until deliberately toggled on — for all users at once, for a specific percentage (directly enabling canary-style feature rollout independent of the deployment mechanism itself), or for specific accounts (enabling internal or beta testing in the actual production environment rather than a separate staging environment). This decoupling means a problematic feature can be disabled instantly by flipping a flag, without requiring a full rollback of the deployment that shipped it — a meaningfully faster mitigation option (§24.3) than a code-level rollback in many incident scenarios.

### 46.6 Rollback: The Mechanism of Last Resort, and Why It Must Be Fast

Regardless of how carefully a rollout is staged, every deployment strategy must have a fast, reliable **rollback** path — reverting to the previous known-good artifact and configuration — because the entire premise of gradual/canary rollout is detecting a problem *before* it's fully out, and detection is only useful if it's followed by a rollback fast enough to actually limit the damage. This is why rollback speed is frequently treated as a first-class metric in its own right (directly connecting to §24.3's mitigate-before-resolve distinction): a team that can roll back in under a minute can afford to ship more frequently and take on more incremental risk per release than a team whose rollback process itself takes an hour of manual, error-prone steps.

### 46.7 Common Mistakes and Production Debugging Signals

- Rebuilding an artifact separately for each environment instead of promoting one immutable artifact (§46.2), producing "it worked in staging but not production" incidents traceable to subtle build differences rather than any genuine environment or data difference.
- Deploying a canary with no automated rollback trigger tied to its actual error-rate/latency metrics, relying on a human to notice a problem manually before it's an issue — often too slow relative to how quickly a canary's traffic share is scheduled to increase (§46.4).
- Accumulating stale feature flags left permanently in a "sometimes on" state long after a feature has fully shipped, leaving dead conditional logic and an ever-growing, hard-to-reason-about configuration surface — feature flags need their own lifecycle discipline, including deliberate removal once a feature is fully and permanently released.

### 46.8 Engineering Intuition

> **How do I know my deployment strategy is inadequate?** If a bad release currently affects 100% of production traffic simultaneously with no staged, partial-exposure step in between, you have no deployment-time blast-radius control at all (§46.4).
>
> **What symptoms indicate an artifact-promotion problem?** Discrepancies between staging and production behavior that trace back to the two environments having been built from source independently, rather than sharing one promoted artifact (§46.2-46.3).
>
> **What metrics indicate deployment risk is well-managed?** Rollback time (mean time from "problem detected" to "traffic fully reverted"); the fraction of incidents caught at the canary stage versus discovered only after full rollout.
>
> **What breaks first if none of this is in place?** Every deployment becomes an all-or-nothing bet on 100% of production traffic simultaneously, directly increasing both the frequency and severity of deployment-caused incidents (§24).
>
> **When is a simple rolling deployment (no canary, no blue-green) sufficient?** For low-traffic, low-stakes services where the cost of a brief, full-exposure bad release is genuinely tolerable — canary and blue-green strategies are a cost (added infrastructure and process complexity) paid specifically to reduce blast radius for releases where that risk reduction matters.
>
> **What would a hyperscale company do?** Run canary deployments with automated, metric-driven rollback as standard practice for every service, decouple feature release from deployment via feature flags as a default pattern, and treat rollback time as a tracked, optimized operational metric (§70).
>
> **What would a two-person startup do?** Use their platform's default rolling deployment strategy, keep rollback as simple as "redeploy the previous artifact," and adopt feature flags only for the specific features risky or large enough to warrant gradual rollout.
>
> **What changes with scale?** At small scale and low deployment frequency, simple rolling deployments with a manual rollback plan are proportionate. As deployment frequency and the cost of a bad release both grow, canary deployments, automated rollback triggers, and feature-flag-based release management become necessary to sustain a high release velocity without a corresponding rise in incident rate (§70).

### 46.9 Exercises

1. A team deploys directly to 100% of production traffic and discovers a severe bug only after every user has been affected. Using §46.4, redesign their deployment process with a canary stage, specifying what metric would trigger an automatic rollback and at what threshold.
2. Explain, using §46.5, a scenario where deploying a feature and releasing it need to happen at different times, and why a feature flag is a better solution than simply delaying the deployment itself until the feature is ready to be fully visible.

### 46.10 Further Reading

- Jez Humble & David Farley, *Continuous Delivery* — the foundational text on build pipelines and artifact promotion underlying §46.2-46.3.
- Pete Hodgson, "Feature Toggles (aka Feature Flags)" (martinfowler.com) — a thorough, practitioner-level treatment of §46.5's pattern and its lifecycle management.

---
