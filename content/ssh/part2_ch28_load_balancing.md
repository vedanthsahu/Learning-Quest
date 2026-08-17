## 28. Load Balancing Algorithms and Reverse Proxies

### 28.1 What This Chapter Adds to §3

§3.3 placed "the load balancer" in the request's journey as the component deciding which backend server handles a request, without saying how. This chapter covers the actual algorithms, the distinction between where in the network stack a load balancer operates, and the specific mechanism (consistent hashing) that matters most once caching or session affinity is involved.

### 28.2 Layer 4 vs. Layer 7 Load Balancing

A **Layer 4 (L4)** load balancer operates at the transport layer — it distributes traffic based on IP address and port information alone, without inspecting the actual content of the requests (e.g., an HTTP path or header). It is fast and protocol-agnostic, but it cannot make routing decisions based on anything inside the request itself. A **Layer 7 (L7)** load balancer (a reverse proxy operating at the application layer) fully parses the request — HTTP method, path, headers, cookies — and can route based on that content (e.g., sending `/api/v2/*` to a different backend fleet than `/api/v1/*`, or routing based on a cookie for session affinity). The tradeoff: L7's deeper inspection costs more processing per request and requires understanding the specific application protocol, but unlocks routing decisions L4 simply cannot make.

### 28.3 Load Balancing Algorithms: How "Which Backend" Gets Decided

Given a pool of healthy backend servers, several algorithms decide which one handles the next request, each with a different implicit assumption about what "balanced" means:

- **Round robin**: cycle through backends in order. Simple, and correct only if every backend has equal capacity and every request costs roughly the same to serve.
- **Least connections**: send the next request to whichever backend currently has the fewest active connections. This adapts automatically to backends that are slower or already busy, correcting for round robin's blind assumption of equal request cost.
- **Weighted variants** of either: assign backends different weights (proportional to their actual capacity) so a bigger machine receives proportionally more traffic — necessary in a fleet with heterogeneous hardware.
- **Consistent hashing**: route based on a hash of some request property (e.g., a user or session ID) such that requests with the same key consistently land on the same backend — critical whenever a backend holds request-relevant local state (a local cache, an in-memory session), directly addressing the statelessness discussion from §18.5 for the cases where full statelessness isn't achievable.

### 28.4 Why Consistent Hashing Specifically, and Not Just Any Hash Function

A naive approach — `hash(key) % number_of_backends` — has a serious operational flaw: adding or removing even one backend changes the modulus, which reassigns nearly *every* key to a different backend simultaneously, defeating the entire purpose of routing consistently (any local cache built up on the old assignment is now useless for almost every key at once). **Consistent hashing** solves this by mapping both backends and keys onto a conceptual ring (via a hash function), with each key routed to the next backend clockwise from its position on the ring.

```
Consistent hashing ring (conceptual):

           Backend A (hash=10)
          /                    \
   key X (hash=95)        Backend B (hash=40)
   routes to A (next            |
   clockwise from 95,      key Y (hash=55)
   wrapping around)        routes to B (next
          \                clockwise from 55)
           Backend C (hash=70)

Adding a new Backend D at hash=60 only reassigns keys that
fall between the previous backend and D (a small fraction of
the ring) — everyone else's routing is undisturbed.
```

The consequence: adding or removing a backend only reassigns the small fraction of keys whose ring position falls in the affected range, leaving the vast majority of key-to-backend assignments — and whatever local state or cache built up around them — undisturbed. This is the exact mechanism referenced when §65 discusses distributing cache load across many cache nodes without a full cache-wide invalidation every time the node pool changes.

### 28.5 Health Checks: Removing Failure From the Routing Decision

A load balancer's routing algorithm is only useful if it routes exclusively to backends that are actually able to serve requests. **Health checks** — periodic probes (a lightweight HTTP request to a dedicated endpoint, or a lower-level TCP connection check) — determine whether a backend is removed from or restored to the pool of eligible targets. The engineering-relevant subtlety: a health check that is too shallow (merely "is the process running") can mark a backend healthy even when it's failing every real request (e.g., its database connection is broken), while a health check that is too strict or too frequent can itself become a source of load or false-positive removals. Getting the health check's actual criteria to match "can this backend truly serve real traffic correctly" is a nontrivial design decision, not a default to accept unexamined.

### 28.6 Common Mistakes and Production Debugging Signals

- Using round robin against a fleet of heterogeneous-capacity backends, silently overloading smaller instances while larger ones sit underutilized — visible as uneven per-backend latency or CPU utilization despite even request counts.
- Using a naive modulus-based hash for session or cache-affinity routing, causing a cascading cache-miss storm every time the backend pool scales — directly explained by §28.4's contrast with consistent hashing.
- A health check endpoint that doesn't actually exercise the backend's real dependencies, leading to a backend being marked healthy and receiving traffic it cannot actually serve correctly (§28.5).

### 28.7 Engineering Intuition

> **How do I know which load-balancing algorithm I need?** If backend capacity is uniform and requests are roughly uniform cost, round robin suffices. If either varies meaningfully, least-connections or weighted variants correct for it. If any backend holds request-relevant local state, you need consistent hashing (or full statelessness, §18.5, to avoid the question entirely).
>
> **What symptoms indicate a load-balancing mismatch?** Persistent, uneven load across backends of supposedly equal capacity; a spike in cache-miss rate or session errors immediately following a scaling event.
>
> **What metrics indicate it?** Per-backend request count, latency, and resource utilization variance across the pool — a well-balanced fleet should show these converging, not diverging.
>
> **What breaks first if health checks are inadequate?** Requests get routed to backends that are technically running but functionally broken, producing user-facing errors the load balancer itself believes it has prevented.
>
> **When is L4 sufficient, and when do you need L7?** L4 suffices when routing never needs to depend on request content — pure, protocol-agnostic distribution. L7 is required the moment routing must depend on path, header, or cookie content, or when consistent hashing on an application-level key is needed.
>
> **What would a hyperscale company do?** Run L7 load balancing with weighted, health-aware, consistent-hash-capable routing as standard infrastructure, often with health checks that exercise real downstream dependencies, not just process liveness (§60).
>
> **What would a two-person startup do?** Use a managed cloud load balancer's default algorithm (commonly round robin or least-connections) with a simple health check, and revisit only if uneven load or cache-affinity issues actually appear.
>
> **What changes with scale?** At a small, homogeneous backend fleet, round robin with a basic health check is entirely adequate. As fleets grow heterogeneous, as caching/session affinity becomes load-bearing, and as backend pools scale up and down frequently (autoscaling), consistent hashing and carefully-designed health checks become necessary rather than optional.

### 28.8 Exercises

1. A fleet of five identical backends is scaled up to eight during a traffic spike, and a service relying on backend-local caching sees its cache hit rate collapse immediately afterward. Using §28.4, explain precisely why, and what routing change would have prevented it.
2. Explain, using §28.5, a health check design for a backend that depends on a database connection, such that the check would correctly detect a backend whose process is running but whose database connection has failed.

### 28.9 Further Reading

- David Karger et al., "Consistent Hashing and Random Trees" (1997) — the original paper introducing the algorithm underlying §28.4.
- NGINX, "Load Balancing Methods" (official documentation) — a practitioner-level treatment of the algorithms in §28.3 as implemented in widely-used reverse proxy software.

---
