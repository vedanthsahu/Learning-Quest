## §31. Transactions, Connection Pools, and Locking

### 1. The Vocabulary

- **Transaction** — a group of database operations that either all succeed together (commit) or
  all fail together (rollback) — no partial result.
- **Commit / rollback** — finalize the transaction's changes, or discard them entirely.
- **Connection pool** — a fixed set of reusable database connections shared across requests,
  instead of opening a brand-new connection per request (which is slow and resource-heavy).
- **Pool exhaustion** — every connection in the pool is in use, so new requests wait or fail
  outright.
- **Row lock** — the database preventing other transactions from modifying a row you're currently
  working with, until your transaction finishes.

### 2. Where It Sits, and Why Teams Use It

Transactions are what make "transfer money from A to B" safe — either both the debit and the
credit happen, or neither does. Connection pooling exists purely for performance: establishing a
new database connection is expensive, so reusing a small pool of them is dramatically cheaper.

### 3. What Actually Breaks

- **A long-running transaction holding a connection** — a slow operation (an external API call,
  a big loop) done *inside* a transaction holds both a database connection and row locks the
  entire time, which can exhaust the pool and block other unrelated requests.
- **Connection pool exhausted under load, especially from serverless/Lambda** — many short-lived
  function instances each opening their own connection can overwhelm a database's max-connection
  limit far faster than a small fixed fleet of long-running servers would; a connection pooler
  (like RDS Proxy) sitting between them is the standard fix.
- **Forgetting to commit or rollback** — a transaction left open (common in error paths that don't
  explicitly handle cleanup) holds locks and a connection indefinitely.
- **Two transactions deadlocking** — transaction A locks row 1 then wants row 2; transaction B
  locks row 2 then wants row 1 — neither can proceed. The database usually detects this and
  aborts one of them, which the application needs to handle by retrying.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I keep transactions as short as possible — no external API calls or slow work inside one — so
  they don't hold connections and locks longer than necessary."
- "Pool exhaustion often isn't 'too much traffic,' it's connections being held too long, or too
  many separate connection-opening clients (like Lambda) hitting the database directly."
- "A deadlock is normal and expected occasionally in a busy system — the application needs to
  catch it and retry, not treat it as a fatal bug."

### 5. Interview-Ready Answer

> "A transaction guarantees a group of changes commit or roll back together, and I try to keep
> them short and focused purely on database work — no slow external calls inside one — because a
> long transaction holds both a connection and row locks the whole time. For connection pool
> exhaustion specifically, I check whether it's actually high traffic or whether something is
> holding connections too long, or whether many short-lived clients like Lambda functions are
> each opening their own connection instead of sharing a pooler."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §27 (Transactions & Isolation Levels) chapter;
companion Cloud Engineering Playbook's §11 (RDS) chapter (RDS Proxy specifically for the
Lambda-connection-exhaustion case).

---
