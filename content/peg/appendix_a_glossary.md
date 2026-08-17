## Appendix A: Glossary

*Every term that showed up across this book's 174 chapters, one alphabetical lookup. If a term
feels embarrassing not to know when it comes up in Slack or an interview, it's here.*

**ADR (Architecture Decision Record)** — a short written record of a significant technical
decision: context, options, choice, and why (§97).

**Alembic** — SQLAlchemy's companion migration tool, generating and applying versioned schema
migrations (§127).

**At-least-once delivery** — the standard queue/webhook guarantee: a message might arrive more
than once, never zero times (§44, §103).

**Availability Zone (AZ)** — one of several physically separate data centers within a cloud
region (§65).

**Back-of-envelope estimation** — rough, order-of-magnitude math (QPS, storage) used to size a
system design in minutes, not a spreadsheet (§109).

**Backoff (exponential)** — waiting progressively longer between retries (§54).

**Backward compatibility** — a change that both old and new code/clients can work with
simultaneously (§23, §32).

**Big-O notation** — describes how runtime or memory scales with input size, ignoring constant
factors (§132).

**Blast radius** — how much of a system is affected when one component fails (§57).

**Block Public Access** — an AWS account/bucket setting overriding any individual permission that
would otherwise make S3 objects public (§67, §142).

**Blocking the event loop** — calling synchronous, blocking code inside an async function, freezing
every concurrent request on that process (§123).

**Bounded context** — the domain-modeling seam along which services or modules should actually be
split (§111).

**Builder (pattern)** — constructs a complex object step by step, useful for many optional
parameters (§116).

**Bulkhead** — isolating resource pools per-dependency so one failure can't starve unrelated
resources (§55).

**Cache-aside** — check cache first, fall through to source on a miss, populate cache after (§38,
§155).

**Cache stampede** — many concurrent requests missing a just-expired popular key at once,
overwhelming the source (§39, §169).

**Canary deployment** — routing a small percentage of traffic to a new version before full
rollout (§10, §14).

**Chain of Responsibility (pattern)** — passes a request along a chain of handlers, each deciding
to process it, pass it on, or both — the pattern behind middleware pipelines (§163).

**Choreography vs orchestration** — choreography: services react to events independently; 
orchestration: a central coordinator calls each step explicitly (§112, §156).

**Chunking (RAG)** — splitting source documents into smaller pieces before embedding for
retrieval (§151).

**Circuit breaker** — stop calling a clearly-failing dependency for a while instead of retrying
indefinitely (§55).

**Cold start** — the latency penalty when a serverless function is invoked after being idle (§112).

**Compensating action** — an explicit "undo" for a saga step that already succeeded, run when a
later step fails (§156).

**Composition over inheritance** — preferring "has-a" delegation over "is-a" subclassing for more
resilient-to-change designs (§110).

**Connection pool** — a fixed set of reusable database connections shared across requests (§31).

**Content Security Policy (CSP)** — a header restricting which sources a page may load
scripts/styles/etc. from (§64).

**Context window** — the maximum tokens an LLM can consider in one request (§83).

**Coroutine** — an `async def` function; produces an awaitable that must be scheduled to run (§123).

**Correlation ID / trace ID** — a shared identifier propagated across services so one request's
logs can be found together (§49, §52, §166).

**CORS (Cross-Origin Resource Sharing)** — browser-enforced rule controlling what cross-origin
JavaScript may read (§3).

**CQRS (Command Query Responsibility Segregation)** — separating the write model from the read
model, sometimes with entirely separate databases (§115).

**CSRF (Cross-Site Request Forgery)** — tricking a browser into sending an authenticated request
the user didn't intend (§60).

**Cursor (keyset) pagination** — pagination anchored to a value, stable under concurrent writes
(§21, §102).

**Database per service** — the microservices rule that each service owns its own database
exclusively (§158).

**Dead-letter queue (DLQ)** — where messages go after failing too many times, for investigation
(§43).

**Deadlock** — two processes each waiting on a resource the other holds, neither able to proceed
(§174).

**Debouncing** — a client-side technique delaying an action until a quiet period after repeated
events (§161).

**Dependency injection (DI)** — supplying an object's dependencies from outside rather than having
it construct them itself (§119, §130).

**Distributed monolith (anti-pattern)** — separately deployed services still coupled tightly
enough (shared database, synchronous chains) to have microservices' cost without its benefit
(§111).

**DST (Daylight Saving Time)** — the clock shift creating "an hour that happens twice or not at
all" (§90).

**ECR / ECS / EKS** — AWS's container registry, native orchestrator, and managed Kubernetes
service respectively (§143).

**Eviction policy** — the rule a full cache uses to decide what to remove (LRU is the common
default) (§41).

**Error budget** — the allowed amount of not-meeting-an-SLO before it's treated as a real problem
(§53).

**Event loop** — the single-threaded scheduler running many coroutines cooperatively (§123).

**Event sourcing** — storing the full sequence of events that led to current state, instead of
just the current state (§115).

**Facade (pattern)** — a simple, unified interface in front of more complex lower-level clients
(§117).

**Factory (pattern)** — hides which concrete class gets instantiated behind a shared interface
(§116).

**Feature flag/toggle** — a runtime on/off switch decoupled from deployment (§14, §94).

**Golden Signals (Four)** — Latency, Traffic, Errors, Saturation — the minimal sufficient
service-level dashboard (§165).

**Greedy-choice property** — the property a problem must have for a greedy algorithm to produce a
correct global answer (§138).

**Grounding** — anchoring an LLM's answer in real retrieved content rather than pure training
knowledge (§85).

**Guardrails (AI)** — a managed layer filtering harmful content and redacting sensitive
information from prompts and responses (§152).

**Hallucination** — an LLM generating confident, plausible, but wrong or fabricated output (§85).

**Head-of-line blocking** — one slow item at the front of a queue blocks everything behind it
(§173).

**Hexagonal / Clean architecture** — business logic at the center, ignorant of the database or web
framework, connected via ports and adapters (§113).

**Hot partition** — a single shard, partition, or cache node receiving disproportionate traffic
due to key skew (§170).

**HPA (Horizontal Pod Autoscaler)** — automatically adjusts Kubernetes pod replica count based on
observed metrics (§144).

**HSTS** — a header telling the browser to only ever use HTTPS for a site (§64).

**IAM role** — a temporarily-assumable AWS identity with no long-lived credentials (§69, §141).

**Idempotency key** — a client-supplied ID letting a retried request be recognized and deduped
(§22, §28).

**Idempotent operation** — doing it once or many times has the same result (§22).

**Inverted index** — a search structure mapping terms to the documents containing them (§81).

**Jitter** — randomness added to a retry delay so many clients don't retry in sync (§39, §54).

**Knowledge Bases (Bedrock)** — Bedrock's managed RAG offering, handling chunking/embedding/
retrieval automatically (§149).

**Leaky bucket** — a rate-limiting algorithm that smooths bursty traffic into a steady outflow
(§162).

**Least privilege** — granting exactly the access needed, no more (§63, §141).

**Lifespan (FastAPI)** — code run once at startup and once at shutdown, for connection pools and
clients (§130).

**LLM-as-judge** — using a model to evaluate another model's open-ended output (§87).

**Load shedding** — deliberately rejecting some requests under extreme load to stay responsive
for the rest (§55).

**Lockfile** — an exact, fully-resolved record of every installed package/version for reproducible
installs (§122).

**MCP (Model Context Protocol)** — a standard protocol for connecting AI models to external tools
and data sources (§89).

**Memoization vs tabulation** — top-down caching of recursive results vs bottom-up iterative table
building — both dynamic programming (§137).

**Memory leak** — memory never released because something still holds a reference to it, even
though it's logically no longer needed (§172).

**Modular monolith** — one deployable unit, internally organized into strict, well-bounded modules
(§111).

**Multi-AZ** — redundant infrastructure spread across multiple Availability Zones (§57, §65).

**N+1 query problem** — one query for a list, then one more per item for related data (§30).

**NAT Gateway** — lets private-subnet resources make outbound internet calls without being
directly reachable (§66, §147).

**Observer (pattern)** — lets subscribers react to a subject's events without the subject knowing
who's listening (§118).

**OAC (Origin Access Control)** — the CloudFront mechanism letting a CDN read from an otherwise
fully-private S3 bucket (§145).

**Optimistic locking** — checking a version/timestamp at write time instead of locking upfront
(§33).

**Outbox pattern** — writing an event into the same transaction as the business change it relates
to, for reliable publishing (§46, §160).

**Pattern forcing** — reaching for a named design pattern because you know it, not because the
problem needs it (§164).

**Permission policy** — an IAM document defining what a role is allowed to do, distinct from its
trust policy (§141).

**Poison message** — a queue message that fails processing every time, redelivered indefinitely
without a DLQ (§174).

**Presigned URL** — a time-limited signed URL for temporary access to a private object (§67, §79).

**Prompt caching** — a provider discount for reprocessing an identical, repeated prompt prefix
(§88).

**Proxy (pattern)** — a stand-in object controlling access to a real object (lazy, remote, or
protection variants) (§163).

**Publication vs. subscription (Pub/Sub)** — one message delivered to every independent
subscriber (§45).

**Quorum** — the minimum number of nodes that must agree for an operation like leader election to
be valid (§171).

**Race condition** — an outcome that depends on unpredictable timing between concurrent operations
(§174).

**RAG (Retrieval-Augmented Generation)** — retrieving relevant content and including it in the
prompt so answers are grounded (§84, §151).

**Read replica** — an asynchronously-updated, read-only database copy (§34).

**Replication lag** — the delay between a write landing on the primary and appearing on a replica
(§34).

**Repository (pattern)** — hides data-access details behind a collection-like interface (§119).

**Reranking (RAG)** — a second-pass model re-scoring initial vector-search results for relevance
(§151).

**Retry storm** — clients retrying a failing dependency so aggressively they worsen the outage
(§173).

**RPO / RTO** — Recovery Point/Time Objective: how much data loss, and how much downtime, is
tolerable (§35, §57).

**Runbook** — a written, specific set of steps for responding to a known incident type (§53).

**Saga** — managing a multi-service business transaction as a sequence of local transactions with
explicit compensations (§156).

**SameSite (cookie attribute)** — controls whether a cookie is sent with cross-site requests, a
major CSRF defense (§60).

**Security group** — a stateful, resource-attached virtual firewall in a cloud VPC (§66, §147).

**Service mesh** — infrastructure (Istio, Linkerd) handling service-to-service concerns via
sidecar proxies (§114).

**Service quota** — a cloud provider's cap on API rate or resource count per account (§71).

**Sharding** — splitting data across nodes so each holds only a subset, for write/storage scaling
(§159).

**Sidecar** — a helper process deployed alongside a service to add cross-cutting behavior
transparently (§114).

**Sliding window** — a two-pointer variant defining a contiguous, expanding/shrinking window over
a sequence (§134).

**SLI / SLO / SLA** — the actual measurement, the internal target, and the (usually looser)
external promise (§53).

**SOA (Service-Oriented Architecture)** — microservices' older relative, typically with a shared
enterprise service bus (§114).

**Split brain** — a network partition causing two nodes to each believe they're the sole primary
(§171).

**Src layout** — placing a Python package inside `src/` so tests exercise the installed package,
not an accidental local import (§131).

**SSRF (Server-Side Request Forgery)** — tricking a server into making a request on the
attacker's behalf (§61).

**State (pattern)** — an object changes behavior by delegating to state-specific objects rather
than a status-field conditional (§163).

**Strangler fig pattern** — gradually replacing a legacy system by routing increasing traffic to
the new one (§157).

**Strategy (pattern)** — encapsulates an interchangeable algorithm behind a common interface
(§118).

**Structured logging** — logging as consistent, machine-parseable key-value data (§47).

**Synthetic monitoring** — automated checks simulating real user flows on a schedule (§168).

**Template Method (pattern)** — a base class fixes an algorithm's skeleton; subclasses override
individual steps (§118).

**Token bucket** — a rate-limiting algorithm that naturally tolerates bursts while capping
sustained rate (§162).

**`traceparent` header** — the W3C standard HTTP header for propagating trace context between
services (§166).

**Trust policy** — an IAM document defining who can assume a role, distinct from what the role
can do (§141).

**TTL (Time To Live)** — how long a cached or DNS value is valid before it must be refreshed (§1,
§38).

**Two pointers** — using two index variables moving through a sequence instead of a nested loop
(§134).

**Unit of Work** — tracks changes during one business operation and commits or rolls them back
together (§119).

**USE Method** — Utilization, Saturation, Errors — the per-resource observability framework (§165).

**UTC (Coordinated Universal Time)** — the timezone-independent reference time; always store
timestamps in it (§90).

**Virtual environment (venv)** — an isolated Python installation with its own installed packages
(§121).

**Visibility timeout** — how long a queue message is hidden from other consumers after being
picked up (§43).

**Vector search** — finding stored embeddings closest to a query's embedding, i.e. similar
meaning, not keyword matching (§84).

**YAGNI (You Aren't Gonna Need It)** — a deliberate bias against building for hypothetical future
requirements (§120, §164).

---
