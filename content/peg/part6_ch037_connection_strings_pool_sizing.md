## §37. Connection Strings, SSL Modes, and Pool-Sizing Gotchas

### 1. The Vocabulary

- **Connection string** — the full set of parameters (host, port, user, password, database name,
  SSL mode) needed to connect to a database, usually formatted as one URL-like value.
- **SSL mode** — how strictly the connection verifies encryption/certificates (`disable`,
  `require`, `verify-ca`, `verify-full` — increasing strictness).
- **Pool size** — how many connections a single application instance's connection pool maintains.
- **Max connections** — the database server's own hard ceiling on total simultaneous connections
  from everyone combined.

### 2. Where It Sits, and Why Teams Use It

This is the unglamorous configuration layer where a surprising number of real production
incidents live — not because the concepts are hard, but because a wrong or missing setting fails
silently or with a cryptic error, far from the actual root cause.

### 3. What Actually Breaks

- **`sslmode=disable` in production out of local-development habit** — copied from a local dev
  connection string where it didn't matter, this sends credentials and data unencrypted over the
  network in an environment where it very much does matter.
- **Total connections across all instances exceeding the database's max** — five application
  instances each with a pool size of 50 is 250 potential connections; if the database's actual
  limit is 100, the math simply doesn't work, and the failure shows up as "random" connection
  errors under load, not an obvious configuration error.
- **A connection string with a typo or stale hostname after a database migration/failover** — the
  app connects fine to what it thinks is the database, silently pointed at the wrong instance, or
  fails outright with an error that doesn't obviously point at "check your connection string."
- **Not accounting for serverless/Lambda's connection multiplication** — as mentioned in §31,
  many short-lived function instances each holding their own connection can exhaust a database's
  max-connections far faster than a small number of long-running pooled servers would.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I know what each part of a connection string does, and I check SSL mode specifically isn't
  accidentally disabled in production."
- "I do the actual math — pool size times number of instances — against the database's real max-
  connections limit, rather than picking pool sizes independently per service."
- "For serverless workloads specifically, I'd put a connection pooler (like RDS Proxy) in front
  of the database rather than letting every function instance connect directly."

### 5. Interview-Ready Answer

> "A surprising number of production database incidents are connection configuration, not query
> logic — SSL mode accidentally left permissive, or total connections across all instances
> exceeding the database's actual max. I do the arithmetic explicitly: pool size per instance
> times number of instances, checked against the database's real limit, and for anything
> serverless, I assume I need a connection pooler in front rather than letting every function
> instance open its own connection directly."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §24 (PostgreSQL for Backend Engineers) chapter;
companion Cloud Engineering Playbook's §11 (RDS) chapter (RDS Proxy).

---
