## 100. Architecture Review Exercises

### 100.1 How to Use These Exercises

Each exercise presents a system's architecture as a design proposal would actually be presented — a short description and its major components — with no bugs to spot, only judgment to exercise. Read each one, form your own opinion of its weaknesses using this handbook's own frameworks before reading the discussion that follows, and resist the urge to skip straight to the discussion — the exercise's value is entirely in having formed your own judgment first.

### 100.2 Exercise 1: The Shared Database Between Two Services

**Proposal**: Two independently-deployed services (an Orders service and an Inventory service) each read from and write directly to the same PostgreSQL database, sharing tables where their data overlaps, to avoid the complexity of inter-service API calls. **Discussion**: This couples the two services' schemas together as tightly as if they were one service, while paying the operational cost of running them as two — any schema change either service needs now requires coordinating with the other, and a slow query from one service can exhaust connection pool capacity (companion §72) the other service needed. The stronger design gives each service its own database and communicates via an explicit API or event stream (companion §36), accepting the real cost of eventual consistency between them in exchange for genuine independence — the entire point of splitting into separate services in the first place.

### 100.3 Exercise 2: Synchronous Fan-Out to Five Downstream Services

**Proposal**: An endpoint that creates an order synchronously calls five downstream services (inventory, payment, shipping, tax, notifications) in sequence within the same request, returning only after all five succeed. **Discussion**: The request's latency is now the *sum* of all five downstream calls' latencies, and its availability is the *product* of all five services' individual availabilities — a single slow or flaky downstream service degrades the entire order-creation experience even for a customer whose order didn't need that specific service to be fast. The stronger design separates what genuinely must complete before responding (payment authorization) from what can happen asynchronously afterward (shipping label generation, notification delivery) — directly the same request-path-versus-background-work distinction this handbook's capstone drew at §84.1 and §86.1.

### 100.4 Exercise 3: One Table, No Foreign Keys, "For Flexibility"

**Proposal**: A single, wide table stores every entity type (users, orders, products) as JSON blobs in a single `data` column, with a `type` discriminator column, justified as giving maximum schema flexibility for future changes. **Discussion**: This trades away the database's own referential-integrity guarantees (companion §24) and query-optimization capability (an index on a JSON field is a real but meaningfully weaker tool than a proper column index, companion §30.2) for a flexibility that's rarely actually needed at the granularity this design assumes — most schema evolution is adding a nullable column (companion §28.6's zero-downtime pattern), which a normal relational schema already handles without this design's costs. This is a concrete instance of companion §108.10's over-engineering-against-a-hypothetical-future-requirement pattern.

### 100.5 Exercise 4: A Cache With No Invalidation Strategy

**Proposal**: A read-through cache in front of a frequently-queried table, with entries expiring purely by a fixed 24-hour TTL and no explicit invalidation on write. **Discussion**: Companion §74.6's exact dominant root cause for "cache isn't helping" complaints — but the more serious risk here is correctness, not performance: a write immediately followed by a read (a user updating their own profile, then viewing it) can serve up to 24 hours of stale data with this design, likely violating an unstated but real user expectation. The stronger design pairs a TTL (as a backstop) with explicit invalidate-on-write for any data path where read-your-own-writes consistency is expected (companion §83.3's ADR-5, applied identically here).

### 100.6 Exercise 5: A "Simple" Retry Loop Around Everything

**Proposal**: Every external call in the codebase is wrapped in a generic retry decorator that retries up to five times on any exception, applied uniformly regardless of the specific operation. **Discussion**: This is companion §99.5's exact mistake — retrying a non-idempotent operation (a payment charge, an email send without a deduplication key) converts a single transient failure into a risk of duplicate side effects, and a blanket, undifferentiated retry policy applied everywhere guarantees this happens to at least some genuinely non-idempotent call in a codebase of any real size. The stronger design applies retries deliberately, per-operation, only after confirming idempotency, with per-operation-appropriate backoff and retry limits (companion §67.5).

### 100.7 Mini Lab

Write your own sixth architecture proposal — deliberately embedding one real weakness drawn from any chapter in this handbook — and give it to a colleague (or re-read it yourself after a week) to review cold, using only the proposal description, exactly as §100.1 asks the reader to do here; noticing how differently a design reads once you've deliberately hidden the flaw yourself, versus reviewing someone else's, is itself an instructive exercise in review empathy.

---
