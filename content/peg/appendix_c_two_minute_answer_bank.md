## Appendix C: Two-Minute Answer Bank

*The core of every chapter's Interview-Ready Answer, one line each, organized by Part — for a
fast scan the night before an interview. Read the full chapter if a line doesn't immediately
click.*

### Part I — Web & Request Flow
**§1** DNS TTL controls propagation delay, not instant everywhere. **§2** GET/PUT/DELETE
idempotent, POST isn't — add idempotency keys. **§3** CORS is server-side response headers, not
frontend-fixable. **§4** Three cache layers (browser/CDN/server) — find which is stale. **§5**
Pick SSE/WebSocket/polling by directionality; sticky sessions needed for persistent connections.
**§6** Encode explicitly at every boundary; don't assume a delimiter survives a pipeline.

### Part II — Load Balancing & Traffic Routing
**§7** L4 = IP/port only, L7 = content-aware routing. **§8** Reverse proxy → LB → gateway is a
role spectrum, not three products. **§9** Health checks enable safe scaling; design stateless to
avoid sticky sessions. **§10** Canary/blue-green reduce blast radius; DB migrations must be
backward-compatible regardless.

### Part III — Deployment & CI/CD
**§11** Env var changes need a restart; build once, configure per environment. **§12** CI/CD
build once, promote the same artifact everywhere. **§13** Order Dockerfile layers by change
frequency; multi-stage builds for lean images. **§14** Rolling deploys run old+new code
simultaneously — plan for it. **§15** Secrets leak via debug prints and committed files most
often — rotate, don't just delete.

### Part IV — Servers, Containers & Runtime
**§16** Containers share the host kernel; VMs don't. **§17** Bind `0.0.0.0` inside containers,
never `localhost`. **§18** Volumes for persistence; `depends_on` ≠ readiness. **§19** Check
dependency versions, data volume, env vars, network before blaming "production." **§20**
Readiness controls routing, liveness controls restarts — different questions.

### Part V — Backend APIs & Service Design
**§21** Consistency > cleverness; cursor pagination for concurrent writes. **§22** Idempotency
keys because retries are normal. **§23** Additive = safe, remove/rename/retype = breaking. **§24**
AuthN then AuthZ, always check object-level permission. **§25** OAuth2 = access, OIDC = identity;
token exchange server-side only. **§26** Async for slow work; retry+backoff+circuit breaker for
flaky dependencies. **§27** Tenant filter is mandatory on every query. **§28** Webhook is the
source of truth, not the client redirect; idempotency keys on charges.

### Part VI — Databases
**§29** Indexes speed reads, slow writes — a tradeoff, not free. **§30** N+1 fixed by eager
loading, not caching around it. **§31** Keep transactions short; pool math must match DB limits.
**§32** Nullable → backfill → constrain; multi-step renames during rolling deploys. **§33** Default
isolation still allows lost updates — pick optimistic or pessimistic deliberately. **§34** Read
replicas lag — route read-your-own-write to primary. **§35** Untested backups are assumptions,
not capabilities. **§36** UUID vs auto-increment is a real write-performance tradeoff. **§37**
Check SSL mode and connection math across all instances.

### Part VII — Caching & Redis
**§38** Cache-aside + always set a TTL. **§39** Stale cache = a write path that forgot to
invalidate. **§40** Redis Pub/Sub has no persistence — not a queue substitute. **§41** Cache only
what's expensive and likely to repeat.

### Part VIII — Queues & Async
**§42** Queues decouple timing; convert slow sync calls to async. **§43** Bounded retries + DLQ,
never infinite or silent drop. **§44** At-least-once is normal — design consumers idempotent.
**§45** Pick by fan-out shape and ordering needs, not habit. **§46** Cron bugs are usually
timezone bugs; use the outbox pattern for DB+event consistency.

### Part IX — Observability & Incidents
**§47** Metrics show something's wrong, logs show specifics, traces show where. **§48** ERROR
means "needs attention" — don't dilute it. **§49** One correlation ID per request, propagated
everywhere. **§50** Look at p95/p99, not average. **§51** Narrow scope and check recent changes
first. **§52** Traces show the timing breakdown across every hop. **§53** SLI/SLO/SLA are
distinct; blameless postmortems need concrete action items.

### Part X — Reliability & Scaling
**§54** Timeout + retry + backoff + jitter, always together. **§55** Circuit breakers fail fast;
bulkheads isolate resource pools. **§56** Autoscaling has real lag — plan headroom. **§57** Check
every layer for hidden single points of failure. **§58** Rollback first, investigate calmly
after.

### Part XI — Security
**§59** Slow, salted hashes (bcrypt/Argon2) — never fast general-purpose hashes. **§60** CORS
reads, CSRF sends — different defenses (SameSite, tokens). **§61** Parameterized queries, output
escaping, restrict server-side fetch targets. **§62** Dedicated secrets manager, scoped narrowly,
audited. **§63** Name the specific policy, don't just say "restrict access." **§64** CSP as
defense-in-depth; validate upload content, not filename.

### Part XII — Cloud & Infrastructure
**§65** Redundancy means spreading across AZs, not just instances. **§66** Databases in private
subnets, NAT Gateway for outbound-only. **§67** S3 privacy = bucket policy + ACL + Block Public
Access together; keep public buckets separate. **§68** Pick compute by workload shape, not habit.
**§69** IAM roles not access keys; scope by resource ARN; trust policy ≠ permission policy. **§70**
Cost spikes are often correctness bugs in disguise. **§71** Check quotas ahead of expected spikes;
cross-account access needs explicit trust both ways.

### Part XIII-XVI — Git, Testing, Files, Search
**§72** Understand both sides of a conflict before resolving. **§73** Rebase only on
unshared branches. **§74** Revert on shared branches, reset only locally. **§75** Automate style,
review logic; version bump matches actual contract change. **§76** Shape the test pyramid
deliberately. **§77** Mock sparingly; real dependencies via testcontainers when behavior matters.
**§78** Coordinate load tests; benchmark before/after; contract-test between services. **§79**
Presigned URLs for uploads beyond trivial size. **§80** Stream, don't buffer; process files in the
background. **§81** `LIKE` isn't full-text search; keep the index in sync deliberately. **§82**
Keep OLAP off the OLTP database; design for late/duplicate events.

### Part XVII — AI Product Engineering
**§83** Tokens drive cost and context limits, not words. **§84** RAG failures are usually
retrieval failures. **§85** Hallucination is ongoing risk — ground it, guardrail real actions.
**§86** Cap agent iterations; human-in-the-loop for consequential actions. **§87** Eval sets must
be realistic and re-run on every change. **§88** Prompt caching + token budgets control cost.
**§89** Structured output over free-text parsing; MCP over one-off integrations.

### Part XVIII-XIX — Time & Communication
**§90** Store UTC, display local, always. **§91** Money is never a float. **§92** PR/ticket/
standup all explain "why," not just "what." **§93** Name debt as a tradeoff, connect paydown to
concrete cost. **§94** Monorepo/polyrepo and feature-flag/env-config are both real tradeoffs, not
habits.

### Part XX-XXI — Product Judgment & Interview Fluency
**§95** "Done" = tested + deployed + monitored. **§96** Rollout plans need a measurable rollback
trigger. **§97** ADRs preserve the "why"; weigh total cost of ownership for build vs. buy. **§98**
What it is → why it matters → concrete example, in under two minutes. **§99** Requirements → scale
→ API/data → components → bottleneck, in that order. **§100** Name entities before code; say "I
don't know" plainly, then reason aloud.

### Part XXII — Why Did This Happen
Every entry in §101-108 already *is* a two-minute answer — that Part doubles as the fastest
possible pre-interview or pre-incident scan in this entire book.

### Part XXIII — Architecture, System Design Vocabulary & Design Patterns
**§109** State NFRs and peak-load estimates before naming any technology. **§110** High cohesion,
low coupling, interfaces at boundaries you expect to change. **§111** Default to a modular
monolith; split only for a concrete organizational reason. **§112** Serverless for spiky I/O work,
mind cold starts; event-driven decouples but still needs idempotency. **§113** Business logic
shouldn't import infrastructure — check the dependency rule literally. **§114** BFF aggregates for
one client; service mesh is operational overhead that pays off at real scale. **§115** CQRS and
event sourcing are separate tools — evaluate each on its own merit. **§116** Factory for
swappable implementations, builder for many optional params, singleton sparingly. **§117** Adapter
wraps third-party SDKs; facade coordinates; decorator adds cross-cutting behavior. **§118**
Strategy replaces conditional chains; observer decouples reactions to events. **§119** Repository
plus DI is what makes business logic testable without a real database. **§120** Name every
architectural choice's cost, not just its benefit.

### Part XXIV — Python Practical Fluency
**§121** One virtual environment per project; pin dependency versions. **§122** Commit the
lockfile; treat "works locally, fails in CI" as a dependency-drift signal first. **§123** A
blocking call inside `async def` freezes every concurrent request, not just one. **§124**
Decorators for cross-cutting behavior; context managers for guaranteed cleanup. **§125** Run a
type checker in CI, not just the editor; avoid `Any` as an escape hatch. **§126** Pydantic
validates requests and settings at the same boundary discipline. **§127** Scope sessions per
request; watch for N+1; schema changes go through Alembic, never manually. **§128** Narrow fixture
scope; parametrize edge cases; don't over-mock. **§129** Design Celery tasks idempotent; pass IDs,
not payloads. **§130** `Depends` for shared per-request logic; connections created once in
lifespan. **§131** `src` layout catches accidental local imports; organize by feature past a
handful of files.

### Part XXV — DSA Interview Surface Fluency
**§132** Name the complexity and point at exactly which code produces it. **§133** A hash map
turns an O(n²) "have I seen this" check into O(n). **§134** Two pointers on sorted data; sliding
window for "best contiguous substring." **§135** Stack for nesting, queue for FIFO/BFS, heap for
"smallest/largest so far." **§136** BFS for shortest path in unweighted graphs; DFS for exhaustive
exploration. **§137** Check for overlapping subproblems before choosing DP over plain recursion.
**§138** Greedy needs a provable greedy-choice property, not just intuition. **§139** Match the
problem's signature to a technique before writing code. **§140** Clarify, brute force, name the
bottleneck, improve, state complexity, test edge cases.

### Part XXVI — Cloud Hands-On Scenario Fluency
**§141** Roles over access keys; scope the permission policy tightly; trust policy is a separate
document. **§142** Encryption ≠ access control; keep Block Public Access on, use CloudFront+OAC
for public assets. **§143** Tag images with a commit SHA; real health checks, not just "process is
running." **§144** Deployments declare desired state; Services give pods a stable address; check
actual pod status separately. **§145** Frontend env vars bake in at build time; hashed filenames
handle cache-busting. **§146** Secrets never in code or CI logs; Secrets Manager for anything that
needs rotation. **§147** Only the load balancer is public; security-group sources should be other
security groups, not `0.0.0.0/0`.

### Part XXVII — Managed AI Service Fluency
**§148** Evaluate providers on rate limits and token pricing, not just model quality. **§149**
Bedrock needs explicit model access per region, separate from IAM permissions. **§150** Auth, rate
limiting, and prompt construction are the real engineering — the model call is the small part.
**§151** A bad RAG answer is usually a retrieval or stale-index problem, not a model problem.
**§152** Securing AI is ordinary security discipline plus keeping untrusted content separate from
system instructions. **§153** Track token cost and latency per pipeline stage, not as one
undifferentiated number.

### Part XXVIII — Architecture Pattern Extensions
**§154** Identify request/response vs event-driven vs batch vs streaming before picking a
technology. **§155** Name the caching pattern in use explicitly — cache-aside is the default.
**§156** Design an explicit, idempotent compensating action for every saga step. **§157**
Strangler fig over a big-bang rewrite; verify actual, not documented, legacy behavior. **§158**
Each service owns its database; no cross-service direct queries. **§159** Replication scales
reads; sharding scales writes/storage — don't confuse them. **§160** Gateway centralizes
cross-cutting concerns; outbox makes event publishing reliable. **§161** Rate limiting is server
policy, throttling is enforcement, debouncing is client-side. **§162** Token bucket tolerates
bursts; rate-limit as early (gateway/CDN) as possible.

### Part XXIX — Design Pattern Extensions
**§163** A middleware stack is Chain of Responsibility; a queued job is Command. **§164** Two real
cases, not one, justify an abstraction — don't force a pattern for its name.

### Part XXX — Observability Pattern Vocabulary
**§165** Cover all four golden signals; watch saturation, not just utilization. **§166** Trace
context must be explicitly propagated across queue and job boundaries. **§167** Page on symptoms,
not causes — alert fatigue erodes trust in every alert. **§168** Dashboards as code; centralize
logs; synthetic checks catch what low real traffic won't.

### Part XXXI — Common Failure Vocabulary
**§169** Coalesce concurrent cache misses; jitter TTLs to avoid synchronized expiry. **§170** A bad
shard key concentrates load on one partition regardless of total shard count. **§171** Majority
quorum prevents split brain; quorum loss looks like confusing partial unavailability. **§172**
Unbounded caches and unclosed connections are leaks in slow motion. **§173** Retries need backoff
and jitter; circuit breakers and bulkheads contain the blast radius. **§174** Deadlock is a hang;
race condition is a wrong answer — different bugs, different fixes.

---
