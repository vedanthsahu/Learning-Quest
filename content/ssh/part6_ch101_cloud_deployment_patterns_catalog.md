## 101. Cloud and Deployment Patterns Catalog

### 101.1 Previously Covered, Named for Catalog Completeness

**Blue-green, canary, and rolling deployment** (§46.4), **feature flags** (§46.5), **active-active and active-passive** (§52.4, §87-88), **multi-AZ and multi-region** (§74.2, §86-88), **service mesh** (§42.3, §67.3), **cell-based architecture** (§96.11), **chaos engineering patterns** (§52.6, §74.4), and **disaster recovery patterns** (§74.3) are all fully derived elsewhere. This chapter adds the deployment-testing patterns that sit *before* a canary rollout in the risk-reduction sequence, and the container/infrastructure roles (control plane/data plane, sidecar's siblings) not yet named explicitly.

### 101.2 Shadow Deployment (Shadow Traffic / Mirroring)

**Problem it answers**: even a carefully staged canary rollout (§46.4) still exposes a small fraction of *real* users to a new version's behavior, which is unacceptable for changes where any user-visible risk at all is unacceptable (a core payment-processing rewrite, a fraud-detection model update). **Solution**: mirror a copy of real, live production traffic to the new version *in parallel* with the old version actually serving the response — the new version's output is logged and compared against the old version's real response, but never actually returned to the user, meaning the new version can be validated against genuine, unmodified production traffic patterns with zero user-facing risk at all. **Tradeoff**: the strongest possible pre-production validation against real traffic, at the cost of running (and paying for) two full parallel execution paths for every mirrored request, and added complexity in safely handling any side-effecting operations the shadowed version might otherwise trigger (a shadow-deployed payment service must not actually charge a card twice — directly requiring careful, deliberate side-effect suppression specifically for the shadow path, not merely duplicating the request naively).

### 101.3 Dark Launch

**Problem it answers**: a new feature's *backend* code needs to be exercised under real production load and conditions before its *user interface* is exposed to any real user — validating that the backend performs correctly and at scale, independent of and prior to any user-facing risk. **Solution**: deploy and fully activate the backend logic in production, wired into real request paths, while keeping the corresponding user-facing entry point (a UI element, an API's public documentation) hidden or disabled — directly using a feature flag (§46.5) to gate visibility while the underlying capability is already live and being exercised. **Distinction from Shadow Deployment**: a dark-launched feature's backend genuinely executes as part of real request handling (just invisibly to users); a shadow-deployed version's output is explicitly *not* used for the real response at all — a subtle but interview-relevant distinction between "running live, but hidden" and "running in parallel, but discarded."

### 101.4 Control Plane and Data Plane

**Problem this vocabulary names**: nearly every piece of infrastructure covered in Parts II-III (Kubernetes, §45; service mesh, §42.3; a load balancer, §28) has two conceptually distinct halves, and naming them precisely clarifies where a given failure or bottleneck actually sits. The **data plane** is the component that actually handles real traffic — a service mesh's per-instance sidecar proxy actually routing and encrypting requests (§42.3); a load balancer's actual packet-forwarding path (§28.2); a Kubernetes node's `kubelet` actually running containers. The **control plane** is the component that configures and coordinates the data plane's behavior but does not itself sit in the path of every single request — a service mesh's control plane pushing routing policy to every sidecar (§42.3); Kubernetes' API server and scheduler deciding what *should* run where (§45.3-45.4) without itself forwarding any application traffic. **Why this distinction matters operationally**: a control plane outage is often far less immediately catastrophic than a data plane outage, precisely because already-configured data planes typically continue handling existing traffic using their last-known configuration even if the control plane is temporarily unreachable — a direct, practical consequence of this architectural separation, and a frequent, specific point of confusion this vocabulary resolves cleanly.

### 101.5 Sidecar, Ambassador, and Adapter Container Patterns

§42.3 and §45.2 already introduced the **sidecar** pattern (a helper container deployed alongside a main application container, sharing its network namespace, §44.2, and lifecycle) generically for the service mesh use case. Two closely related, more specific naming conventions exist for particular sidecar use cases:

**Ambassador Pattern** — a sidecar specifically dedicated to proxying and simplifying the main container's *outbound* network connections to external services — handling service discovery, retries, and circuit breaking (§42.4-42.5) on the main application's behalf, so the application code itself can make what looks like a plain local call. This is, functionally, a service mesh sidecar's outbound-specific responsibilities, named separately when implemented as a standalone, lighter-weight pattern rather than a full mesh.

**Adapter Container Pattern** — a sidecar specifically dedicated to standardizing the main container's *output* for external consumption — for example, transforming a legacy application's non-standard log or metrics format into the standardized format your observability platform (§48.3) expects, without modifying the legacy application itself. This is the container-orchestration-level instance of the Adapter design pattern (§94.3) and the Message Translator integration pattern (§97.8), now applied to an entire container's output rather than a single method call or message.

### 101.6 Init Containers

**Problem it answers**: a main application container sometimes has setup work that must complete fully *before* the main container starts — running a database migration, waiting for a dependency to become reachable, fetching configuration — and that setup logic doesn't belong mixed into the main container's own long-running process. **Solution**: Kubernetes-native **init containers** run to completion, in a defined order, before the main container(s) in a pod are started at all — directly separating one-time setup concerns from the main application's ongoing runtime responsibilities, a container-level instance of the Single Responsibility Principle (§93.2) applied to pod (§45.2) design.

### 101.7 Engineering Intuition

> **How do I know if I need Shadow Deployment rather than a careful canary?** When even the small, contained risk a canary accepts (§46.4) is genuinely unacceptable for this specific change — typically reserved for the highest-stakes changes (core payment logic, safety-critical decision systems), not applied as a default for ordinary feature work given its real operational cost.
>
> **How do I distinguish Dark Launch from a feature flag alone?** A feature flag (§46.5) is the *mechanism*; Dark Launch is the specific *strategy* of using that mechanism to validate backend load-handling before any UI exposure — naming the strategy, not just the mechanism, is what signals fluency.
>
> **Why does the control plane/data plane distinction matter practically?** It directly predicts blast radius during a control-plane outage — recognizing that existing data-plane traffic often continues on stale-but-functional configuration is the difference between correctly triaging an incident as "degraded but not down" versus over-reacting to a control-plane alert as if it were a full outage.

### 101.8 Exercises

1. A team is rewriting their core fraud-detection scoring logic and wants zero user-facing risk during validation, even the small, contained risk a canary deployment accepts. Using §101.2, propose an approach and name the specific safeguard needed for any side-effecting calls the new logic might otherwise trigger.
2. Explain, using §101.4, why a service mesh's control plane becoming temporarily unreachable does not necessarily mean the mesh's data plane stops correctly routing already-configured traffic, and why this distinction changes how an incident should be triaged.

---
