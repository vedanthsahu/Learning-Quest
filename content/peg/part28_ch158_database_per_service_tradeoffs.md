## §158. Database per Service and Shared Database Tradeoffs

### 1. The Vocabulary

- **Database per service** — each microservice owns its own database, which no other service
  accesses directly — the standard microservices data-ownership rule.
- **Shared database (anti-pattern in a microservices context)** — multiple services reading and
  writing the same database directly — the specific pattern behind §111's "distributed monolith"
  failure mode.
- **Data ownership** — the principle that exactly one service is the authoritative source for a
  given piece of data; other services get it via an API call or an event, never a direct query
  against the owner's tables.
- **Cross-service joins / reporting complexity** — the real cost of database-per-service: a query
  that would be a simple SQL join in a shared database now requires calling multiple services and
  combining results in application code, or building a separate reporting/analytics data store.

### 2. Where It Sits, and Why Teams Use It

This is the concrete data-layer consequence of the microservices decision in §111: independent
deployability requires independent data ownership, because a service can't safely change its
schema if another service is directly querying its tables. A shared database between "separate"
services means neither can evolve its schema without coordinating with the other — exactly the
distributed-monolith trap. The cost of database-per-service is real and specific: operations that
used to be one query become multiple service calls, and cross-service reporting needs its own
solution (typically a separate analytics/data-warehouse pipeline, §82).

### 3. What Actually Breaks

- **A "microservices" system with a shared database** — the most common version of this
  anti-pattern: two services deployed independently but reading and writing the same tables,
  meaning a schema change in one can silently break the other with no compile-time or deploy-time
  warning.
- **No plan for cross-service queries before splitting the database** — a team that adopts
  database-per-service without first identifying which queries used to be simple joins can be
  surprised by how much application-level complexity replaces what used to be one SQL statement.
- **Duplicating data without a clear ownership and sync strategy** — services caching another
  service's data locally (a reasonable and common pattern) without a clear plan for keeping it
  reasonably fresh, leading to visible, unexplained inconsistency between services' views of the
  same entity.
- **No separate path for reporting/analytics** — trying to run heavy cross-service analytical
  queries against services' live operational databases, rather than a separate data warehouse fed
  by each service, risks impacting production performance for both the operational and the
  analytical use case.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I treat 'each service owns its own database, with no other service querying it directly' as a
  hard rule once services are genuinely split — a shared database defeats independent
  deployability."
- "Before splitting a database, I identify which existing queries were joins across what will
  become separate services, since those become real, ongoing application-level complexity."
- "For cross-service reporting, I'd build a separate data pipeline into a warehouse rather than
  querying multiple services' live operational databases directly."

### 5. Interview-Ready Answer

> "If services are genuinely independent, I hold the line on database-per-service — no other
> service queries another's tables directly, since that's what actually gives independent
> deployability its teeth. The real cost I'd flag upfront is that queries which used to be simple
> joins become multiple service calls or a separate reporting pipeline, so I'd map out which
> existing cross-entity queries exist before splitting, rather than discovering the complexity
> after the fact. For analytics specifically, I'd feed a separate data warehouse from each service
> rather than querying live operational databases across service boundaries."

### 6. Go Deeper

companion Software Systems Handbook's §12 (Mental Model: Microservices vs Monoliths, DDD) chapter
for the bounded-context reasoning that data ownership is built on (neither book has a chapter
specifically titled "data ownership"); this book's §111 (monolith/microservices) and §82 (ETL/
ELT/data warehouses) for the adjacent architectural and analytics-pipeline coverage.

---
