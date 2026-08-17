## 110. Architecture Review Exercises II: Spotting the Missing Failure Mode and the Wrong Tradeoff

### 110.1 Purpose: Extending §109's Review Skill to Failure-Mode and Tradeoff Analysis

§109's exercises focused on missing requirements and unjustified components. This chapter's four exercises focus on a distinct, equally common review gap: a design that looks reasonable under normal operation but has an unaddressed failure mode, or has made a tradeoff the reviewer should be able to identify and question even when it isn't stated explicitly.

### 110.2 Exercise: The Payment Retry Logic

**Proposed architecture:** "If a payment provider API call times out, our service automatically retries the exact same request up to three times with no delay between attempts, to maximize the chance of success before giving up."

**What to look for before reading on:** Consider §105.5's payment-system idempotency discussion and §64's real-incident retry-storm pattern.

**Analysis:** Two distinct missing failure-mode considerations here. First, retrying a payment request without an idempotency key (§105.5, §29.8) risks a duplicate charge if the original request actually succeeded but the *response* was what timed out — a classic, costly payment-system bug. Second, retrying immediately with no backoff, especially across many concurrent requests during a provider slowdown, is exactly the retry-storm pattern (§64's real-incident case studies) that turns a transient provider blip into a self-inflicted traffic spike, worsening the very problem the retry was meant to route around. **The fix:** Require an idempotency key on every payment request so retries are safe by construction, and use exponential backoff with jitter between retry attempts (§64.5) rather than immediate, synchronized retries.

### 110.3 Exercise: The Read Replica Failover

**Proposed architecture:** "Our application reads from a pool of read replicas for all read traffic. If the primary database fails, we promote one read replica to be the new primary, and the application automatically reconnects."

**What to look for before reading on:** Consider §34's replication mechanics, specifically replication lag, and what happens to in-flight reads during promotion.

**Analysis:** The missing failure mode is replication lag at the moment of failover — if the promoted replica was even slightly behind the failed primary when the failure occurred, any writes acknowledged by the old primary just before it failed may be *lost* (not just delayed) once the lagging replica becomes the new source of truth, unless the replication mode was synchronous or the promotion logic specifically selects the most caught-up replica and reconciles the gap. A second, related gap: the description doesn't address what happens to the *other* replicas that were replicating from the now-failed primary — they need to be repointed to the newly-promoted primary, and until that repointing happens, they continue serving stale reads without any indication to the application that they're now doubly stale. **The fix:** Use semi-synchronous replication or explicitly select the most-caught-up replica for promotion (§34.4), and have an automated or clearly-runbooked process to repoint remaining replicas — and, critically, document what data-loss window (if any) is acceptable, since "no visible failure" doesn't mean "no failure occurred."

### 110.4 Exercise: The Feature Flag Rollout

**Proposed architecture:** "We roll out new features by deploying code behind a feature flag, then enabling the flag for 100% of users simultaneously once the deploy is confirmed successful."

**What to look for before reading on:** Consider §46's deployment strategies (blue-green, canary, rolling) and what "confirmed successful" is actually verifying.

**Analysis:** The wrong tradeoff here is treating "the deploy succeeded" (the code is running without crashing) as equivalent to "the feature is safe to enable for all users" (the feature's actual behavior is correct at scale) — these are different questions, and enabling a flag for 100% of users at once discards the entire risk-reduction value a feature flag mechanism exists to provide (§46.3's canary/progressive-delivery reasoning). A feature can deploy successfully and still have a subtle bug that only manifests under real production load or for a specific user segment, which is exactly what a gradual flag rollout (1% → 10% → 50% → 100%, monitoring at each step) is designed to catch before full exposure. **The fix:** Roll the flag out progressively with explicit monitoring checkpoints (§46.3, §52's SLO-based go/no-go criteria) between each stage, treating "deploy succeeded" and "feature is validated at scale" as genuinely separate milestones.

### 110.5 Exercise: The Circuit Breaker Configuration

**Proposed architecture:** "We added a circuit breaker in front of every downstream service call. Once a circuit opens, we immediately return a generic error to the end user and keep the circuit open for a fixed 60 seconds before automatically attempting to close it again."

**What to look for before reading on:** Consider §42's circuit-breaker mechanics and whether a single, uniform policy across "every downstream service call" is actually the right tradeoff.

**Analysis:** The wrong tradeoff is applying one uniform circuit-breaker policy (threshold, open duration, fallback behavior) across every downstream dependency regardless of that dependency's actual criticality and failure characteristics. A non-critical dependency (an optional recommendation service) failing should perhaps degrade gracefully (show the page without recommendations) rather than surface a generic error to the user — while a critical dependency (the payment provider) failing genuinely may need to block the specific action that depends on it. Additionally, a fixed 60-second reopen window applied uniformly doesn't account for dependencies with very different typical recovery times — too short a window for a dependency that takes minutes to recover causes repeated failed probe attempts; too long a window for a dependency that recovers in seconds delays legitimate recovery unnecessarily. **The fix:** Configure circuit-breaker parameters and fallback behavior per-dependency based on its actual criticality (§42.5's bulkhead-isolation reasoning, applied per-dependency) and typical failure/recovery characteristics, rather than a single, uniform policy — and distinguish "fail loudly to the user" from "degrade gracefully" based on whether the dependency is actually essential to the requested action.

### 110.6 Engineering Intuition

> **What's the fastest way to find a missing failure mode in a presented design?** Ask, for every component: "what does this component do when it's slow, when it's down, and when it returns a wrong-but-successful-looking answer?" — a design description that only addresses the happy path has, by construction, not addressed at least one of these three questions (§110.2's timeout case, §110.3's silent-staleness case).

> **What's the fastest way to spot a wrong (not just unstated) tradeoff?** Look for a single, uniform policy applied across components that plausibly have different actual requirements (§110.4's uniform 100%-rollout, §110.5's uniform circuit-breaker config) — real systems rarely have genuinely uniform needs across every dependency or every feature, and a design that treats them uniformly has usually smuggled in an unexamined simplifying assumption.

> **What would over-engineering a review response look like here?** Demanding maximum granularity and customization for every single parameter and dependency regardless of actual differentiation need — some uniformity is genuinely fine when dependencies really are similar in criticality and behavior; the review skill is recognizing *when* uniformity hides a real problem, not rejecting uniformity categorically.

### 110.7 Further Reading

- §42 (Microservices Mechanics: Circuit Breakers/Bulkheads), §34 (Replication Mechanics), §46 (CI/CD: Deployment Strategies), §64 (Retry Storm Case Studies) — the direct mechanism foundations for this chapter's four exercises.

---
