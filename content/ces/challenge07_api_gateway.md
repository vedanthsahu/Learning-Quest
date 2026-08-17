## Project 07: API Gateway

### Problem Statement

A growing company now has several separate backend services (orders, users, inventory), each with its own API. Client applications currently have to know about and call each service directly, and every service has independently implemented its own authentication, rate limiting, and logging — inconsistently. The business wants one single entry point that clients talk to, which then routes requests to the correct backend service, applying consistent cross-cutting behavior along the way.

### Functional Requirements

- Route an incoming request to the correct backend service based on the request path.
- Authenticate every incoming request once, centrally, before it reaches any backend service.
- Apply rate limiting centrally, consistently, across all services.
- Log every request and response centrally for observability.

### Non-Functional Requirements

- **Latency overhead**: the gateway sits in front of every single request to every service — its own added latency must be minimal.
- **Availability**: since every request passes through this one component, its own reliability directly caps the reliability of everything behind it — think carefully about what "the gateway itself becomes a single point of failure" implies.
- **Extensibility**: adding a new backend service should require minimal gateway configuration changes, not a code change.
- **Fault isolation**: one backend service being slow or down should not degrade requests destined for a different, healthy service.

### Project Scope

**In scope**: request routing, centralized authentication, centralized rate limiting, centralized logging. **Out of scope**: request/response transformation or protocol translation (e.g., REST-to-gRPC), API versioning strategy, a full service mesh (this is a simpler, edge-level gateway, not a mesh).

### Engineering Questions (Answer Them Yourself First)

- If the gateway itself goes down, what happens to every backend service behind it, even the ones that are perfectly healthy?
- Should authentication logic live once in the gateway, or be duplicated in every backend service "just in case"? What are the risks of each choice?
- If backend service A is slow due to its own internal problem, should a request to backend service B, which shares the same gateway, be affected at all?
- How does the gateway know where to send a request for a *new* service that didn't exist yesterday?

### Architecture Thinking

Sketch the path of an incoming request from client to backend service and back, marking every point where the gateway does something (authenticates, rate-limits, logs, routes) versus simply passing the request through unchanged. Consider what happens if backend service A takes 30 seconds to respond — does your gateway's handling of concurrent requests to backend service B get affected at all, or are they fully independent? Estimate: if the gateway itself needs to handle the combined traffic of every service behind it, what does that imply about how it should be deployed compared to any single backend service?

### Progressive Hint System

**Level 1**: Consider what it means for a single component to sit in front of *everything* — what deployment property does that component need that individual services might not need as urgently? **Level 2**: Look into how a routing table or configuration (rather than hardcoded logic) could let the gateway learn about new backend services without a code change. **Level 3**: Research the circuit breaker pattern specifically as applied per-backend-service within a gateway, and research horizontal scaling and redundancy for a component with no single point of failure. **Level 4**: A standard gateway design is deployed as multiple redundant instances behind a load balancer (so the gateway itself has no single point of failure), maintains a configuration-driven routing table mapping path prefixes to backend services, applies authentication and rate-limiting as shared middleware before routing, and wraps each backend service's calls in an independent circuit breaker so one service's degradation doesn't propagate to requests for other services.

### Common Engineering Traps

- **Deploying the gateway as a single instance** — given that every request passes through it, what does this do to the entire system's availability ceiling?
- **Hardcoding the list of backend services and their addresses directly in gateway code** — what has to happen, and how long does it take, every time a new service needs to be added?
- **Sharing one connection pool or one circuit breaker across all backend services indiscriminately** — what happens to requests for a healthy service if a different, unhealthy service exhausts the shared resource?
- **Duplicating authentication logic in both the gateway and every backend service "for defense in depth" without a clear reason** — is this actually adding safety, or just adding maintenance burden and inconsistency risk?

### Reflection Questions

- If you had to add a brand new backend service tomorrow, what exactly would you need to change in your gateway design?
- How would you test that a failure in one backend service doesn't cascade into failures for unrelated services through the shared gateway?
- Is a single, central gateway always the right choice? Under what circumstance might per-service edge logic be preferable?

### Completion Checklist

- [ ] I have a design where the gateway itself is not a single point of failure.
- [ ] I have a routing mechanism that doesn't require a code change to add a new service.
- [ ] I have per-service fault isolation, not one shared failure domain across all backend services.
- [ ] I can justify where authentication logic lives and why it isn't duplicated without reason.
- [ ] I am ready to compare my reasoning against the Solution Guide.

---
