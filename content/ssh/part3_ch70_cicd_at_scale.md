## 70. CI/CD at Scale: Monorepo vs. Polyrepo Builds, Progressive Delivery for Thousands of Services

### 70.1 What This Chapter Adds to §15 and §46

§15 and §46 covered CI/CD principles and mechanics for a single service. This chapter covers what changes once an organization must build, test, and deploy thousands of services continuously, where build system architecture and deployment coordination become significant engineering challenges in their own right.

### 70.2 Monorepo vs. Polyrepo: Where Conway's Law Meets Build System Architecture

A **monorepo** keeps every service's code in a single, shared version-control repository; a **polyrepo** gives each service (or small group of services) its own independent repository. This is a genuine, consequential tradeoff, not a stylistic preference: a monorepo makes cross-service refactoring and dependency version consistency far easier (a single, atomic commit can update a shared library and every one of its consumers simultaneously, avoiding the version-skew problems that plague polyrepo dependency updates) but requires substantial build-system investment to remain fast at scale (naively rebuilding and retesting the entire repository on every commit becomes completely impractical once it contains thousands of services, necessitating sophisticated **incremental build** systems that determine precisely which services are actually affected by a given change and rebuild/retest only those). A polyrepo avoids that build-system investment (each repository is small and fast to build independently) but reintroduces the API-contract and versioning discipline from §29.6 for *every* internal dependency between services, since there's no longer a single atomic commit that can update a shared dependency and all its consumers together.

### 70.3 Incremental Builds: Making Monorepos Tractable at Scale

The specific technical mechanism that makes monorepos viable at large scale is a build system that maintains a precise dependency graph of which source files affect which build targets (services, libraries), so that a given commit's build and test process touches only the targets actually affected by the changed files — directly analogous to the reconciliation-loop principle from §45.4 (only act on what has actually changed) applied to build systems instead of infrastructure state. Without this precision, a monorepo's build time grows with the *total* size of the repository rather than the size of any individual change, which quickly becomes untenable — this is precisely why organizations operating monorepos at scale invest heavily in custom or specialized build tooling (Bazel and similar systems being widely-cited examples) rather than relying on simpler build tools designed for smaller-scale use.

### 70.4 Progressive Delivery at Fleet Scale: Automating What §46.4 Described Manually

§46.4 described canary deployments as a deliberate, staged rollout strategy. At the scale of thousands of services deploying continuously (often many times per day, in aggregate, across the fleet), manually monitoring each individual canary rollout's health and manually deciding when to proceed or roll back becomes impossible — **progressive delivery** platforms automate this entire process: automatically shifting traffic incrementally to a new version, automatically monitoring the exact SLI-based metrics defined for that service (§52.2), and automatically rolling back the instant those metrics breach a pre-defined threshold, with no human required to watch a dashboard and make the call for the vast majority of routine deployments. This is the direct, necessary automation of the same canary principle from §46.4, made mandatory rather than optional specifically because human-monitored rollouts simply cannot scale to the deployment frequency and service count involved.

### 70.5 Build and Deployment as Shared Platform Infrastructure

At this scale, CI/CD tooling itself becomes a dedicated internal platform, typically owned by a specialized platform engineering team, rather than something each service team configures independently from scratch. This mirrors the shared-infrastructure argument made for service mesh (§42.3, §67.3) and consensus (§64.2): the difficulty and risk of getting build and deployment infrastructure right is concentrated into a small, specialized team's expertise, and every other team consumes that infrastructure as a well-tested, standardized platform, rather than each of potentially thousands of teams independently reinventing (and potentially getting subtly wrong) their own CI/CD pipeline.

### 70.6 Common Mistakes and Production Debugging Signals

- Adopting a monorepo without the necessary incremental build investment (§70.3), leading to build and test times that grow with total repository size and eventually become an organization-wide productivity bottleneck.
- Adopting a polyrepo strategy without rigorous internal API/library versioning discipline (§70.2, §29.6), leading to significant version-skew problems and duplicated effort keeping many independent repositories' shared dependencies in sync.
- Attempting to scale canary deployment practice across thousands of services via manual monitoring rather than automated progressive delivery (§70.4), producing either an unsustainable operational burden or, more likely, inconsistent, under-monitored rollouts across much of the fleet.

### 70.7 Engineering Intuition

> **How do I know whether monorepo or polyrepo fits my organization better?** Weigh how often cross-service refactoring and shared-dependency consistency actually matter for your workload against your willingness to invest in incremental build tooling — a small number of loosely-coupled services often favors polyrepo simplicity; a large number of tightly-interdependent services favors monorepo consistency, provided the build tooling investment is made.
>
> **What symptoms indicate a monorepo build-scaling problem?** Build and test time growing steadily as the repository grows, regardless of how small individual changes actually are — a direct sign that incremental build precision (§70.3) is inadequate or absent.
>
> **What metrics indicate a progressive delivery gap?** The fraction of deployments across the fleet that receive genuine, careful health monitoring during rollout — a low fraction, relying instead on ad hoc or absent monitoring, signals a need for automated progressive delivery (§70.4) rather than continued reliance on manual vigilance.
>
> **What breaks first if these aren't addressed?** Monorepo build times become an organization-wide bottleneck slowing every team simultaneously; polyrepo dependency versioning drifts into a significant, recurring coordination tax; unmonitored, unautomated canary rollouts fail to catch bad deployments before they reach full production traffic.
>
> **When is a simple, single build pipeline (no monorepo/polyrepo tradeoff, no automated progressive delivery) sufficient?** For a small number of services deployed relatively infrequently — the sophisticated build and deployment infrastructure in this chapter earns its investment specifically at the scale where manual, ad hoc processes stop working, not before.
>
> **What would a hyperscale company do?** Invest heavily in custom incremental build tooling for a monorepo (or rigorous versioning discipline for a polyrepo), operate a dedicated platform engineering team owning CI/CD as shared infrastructure, and mandate automated progressive delivery for essentially all production deployments (§67).
>
> **What would a two-person startup do?** Use a simple polyrepo (or a single, small monorepo with no special tooling needed at their scale) and a straightforward CI/CD pipeline provided by their hosting platform, without automated progressive delivery beyond basic rolling deployment.
>
> **What changes with scale?** At small scale, simple build and deployment tooling suffices regardless of repo strategy. At the scale of many services and high deployment frequency, the specific architectural choices and automation investments in this chapter become necessary to sustain both engineering velocity and deployment safety (§67).

### 70.8 Exercises

1. An organization's monorepo build times have grown to over an hour for even trivial, single-file changes. Using §70.3, diagnose the likely underlying gap and propose the general category of fix.
2. Explain, using §70.2, a specific scenario where a polyrepo's lack of atomic, cross-repository commits would cause a real coordination problem when updating a shared internal library used by many services.

### 70.9 Further Reading

- Google Engineering, "Why Google Stores Billions of Lines of Code in a Single Repository" (2016) — the widely-cited account of monorepo build-system investment at extreme scale, directly underlying §70.3.
- Progressive Delivery resources from projects like Argo Rollouts and Flagger (official documentation) — practitioner-level treatment of the automated canary/progressive delivery mechanisms in §70.4.

---
