## §33. Isolation Levels, Deadlocks, and Optimistic Locking

### 1. The Vocabulary

- **Isolation level** — how much one transaction is shielded from seeing another's in-progress
  changes (Read Committed, Repeatable Read, Serializable are the common ones, in increasing
  strictness).
- **Dirty read / non-repeatable read / phantom read** — the specific anomalies stricter isolation
  levels prevent.
- **Pessimistic locking** — lock the row before working on it, so nobody else can touch it
  meanwhile (`SELECT ... FOR UPDATE`).
- **Optimistic locking** — don't lock anything upfront; instead, check a version number/timestamp
  at write time, and fail the write if it's changed since you read it.

### 2. Where It Sits, and Why Teams Use It

This is the practical layer underneath "why did my update get lost" or "why does this query
sometimes deadlock under load" — most engineers never need to pick a non-default isolation level,
but understanding what the default actually guarantees (and doesn't) matters the moment two
requests touch the same row concurrently.

### 3. What Actually Breaks

- **Lost update** — two requests read the same row, both compute a new value based on what they
  read, and whichever writes second silently overwrites the first's change with no error at all —
  a classic race condition invisible without concurrent load.
- **Deadlock under load** — two transactions lock rows in opposite order and both wait on each
  other forever; the database detects this and kills one, which the application must catch and
  retry (see §31).
- **Picking pessimistic locking for a high-traffic, low-conflict resource** — locking every row
  upfront "to be safe" when conflicts are actually rare adds real contention and slows everything
  down for a problem that mostly doesn't happen; optimistic locking (checked at write time) is
  often the better fit precisely because most writes won't actually conflict.
- **Assuming the default isolation level prevents all race conditions** — most databases default
  to Read Committed, which still allows non-repeatable reads and the lost-update pattern above;
  it is not "as safe as possible" out of the box.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "The default isolation level in most databases still allows lost updates — I don't assume
  concurrency safety is automatic just because I'm inside a transaction."
- "I reach for optimistic locking (a version column checked on write) when conflicts are rare, and
  pessimistic locking (`SELECT FOR UPDATE`) when conflicts are common enough that retrying
  optimistic failures would itself become a problem."
- "A deadlock is something the application needs to catch and retry, not treat as an
  unrecoverable error."

### 5. Interview-Ready Answer

> "By default, most databases only guarantee Read Committed isolation, which still allows a lost
> update if two transactions read then write the same row concurrently. For that specific problem
> I'd use optimistic locking — a version column checked at write time — when conflicts are
> expected to be rare, since it doesn't add locking overhead for the common case, and pessimistic
> row locking when conflicts are frequent enough that retrying would itself be expensive."

### 6. Go Deeper

companion Software Systems Handbook's §32 (Transactions & Concurrency Control: ACID, isolation,
MVCC) chapter (ACID, isolation levels, MVCC, locking, deadlocks in full).

---
