## 32. Transactions and Concurrency Control: ACID, Isolation Levels, MVCC, Locking, Deadlocks

### 32.1 What This Chapter Adds to §6.4-6.6

§6.4-6.6 established why transactions, isolation, and durability exist conceptually. This chapter covers the formal ACID properties, the concrete isolation levels databases actually offer (and the specific anomalies each one permits), the MVCC mechanism most modern databases use to implement them efficiently, and deadlock detection/prevention.

### 32.2 ACID, Precisely

**Atomicity**: a transaction's multiple operations either all take effect or none do — no partial completion is ever visible, even across a crash (delivered by the write-ahead log mechanism from §31.5). **Consistency** (the most frequently misunderstood of the four): the transaction takes the database from one valid state to another, respecting whatever application-defined invariants and constraints exist — this is actually an application-level guarantee that the database enforces the rules you've defined (foreign keys, uniqueness), not an independent property the database provides on its own. **Isolation**: concurrent transactions do not observe each other's intermediate, uncommitted state — the specific degree of isolation is configurable, and is the subject of §32.3. **Durability**: once a transaction is acknowledged as committed, it survives any subsequent crash (again, the WAL from §31.5 is the mechanism).

### 32.3 Isolation Levels: A Spectrum of Which Anomalies Are Permitted

Full isolation (as if transactions ran one at a time, with no overlap at all — **serializability**) is the strongest and simplest to reason about, but the most expensive to implement, because it fundamentally limits how much work can genuinely happen concurrently. Real databases offer a spectrum of weaker levels, each permitting specific, named anomalies in exchange for better concurrency:

```
Isolation level          Anomalies permitted
-----------------------  --------------------------------------------
Read Uncommitted         Dirty reads (see another transaction's
                          uncommitted changes)
Read Committed           Non-repeatable reads (the same query run
                          twice in one transaction sees different
                          committed data, because another transaction
                          committed in between)
Repeatable Read           Phantom reads (a range query run twice sees
                          different ROWS, because another transaction
                          inserted new rows matching the range)
Serializable              No anomalies — behaves as if transactions
                          ran strictly one after another
```

The engineering decision here is a direct instance of §1.7's tradeoff shape: a stricter isolation level eliminates more classes of subtle bugs but permits less true concurrency (more transactions block or abort due to conflicts), while a weaker level allows more throughput at the cost of the application needing to tolerate, or explicitly guard against, the anomalies that level permits. Choosing "Serializable everywhere" by default is not free — it is a deliberate, sometimes costly choice, appropriate when the specific anomalies it prevents would otherwise cause real business-logic bugs (e.g., double-booking a seat, per Part IV's own subject matter).

### 32.4 MVCC: How Modern Databases Deliver Strong Isolation Without Constant Blocking

**Multi-Version Concurrency Control (MVCC)** is the mechanism most modern databases (PostgreSQL, MySQL/InnoDB, and others) use to implement the isolation levels in §32.3 efficiently: rather than making readers wait for writers to finish (or vice versa) via locks, the database keeps multiple **versions** of each row, and each transaction sees a consistent **snapshot** of the data as of some point in time, ignoring versions created by transactions that started after it (or that haven't committed yet). This means readers essentially never block writers and writers essentially never block readers — a huge concurrency win over naive lock-everything approaches — at the cost of needing to store and eventually clean up old row versions no longer visible to any active transaction (a background process often called **vacuuming** or **garbage collection**).

```
MVCC (conceptual):

  Row "balance=100" is updated by Transaction A to "balance=90"
  (but A has not committed yet)

  Transaction B, which started before A committed, still sees
  "balance=100" — its own consistent snapshot, unaffected by A's
  in-flight change.

  Once A commits, any NEW transaction starting afterward sees
  "balance=90". B, already in progress, continues seeing its
  original snapshot until it finishes.
```

### 32.5 Locking: Where MVCC Isn't Enough, and Why Deadlocks Happen

MVCC handles read/write conflicts gracefully, but write/write conflicts (two transactions trying to modify the same row) still require some form of locking to serialize the actual writes. This reintroduces exactly the deadlock risk discussed at the thread level in §26.3, now at the level of database rows and transactions: Transaction A locks Row 1 and wants Row 2; Transaction B locks Row 2 and wants Row 1; neither can proceed. Databases detect this by maintaining a **wait-for graph** (which transaction is waiting on which) and periodically checking for cycles — when a cycle is found, the database picks one transaction as the **deadlock victim**, aborts it (rolling back its changes), and allows the others to proceed. The practical engineering implication: application code that performs multi-row transactions must be prepared to receive and retry a deadlock-abort error — it is not a bug in the application's logic, it is an expected, occasional outcome of concurrent access that must be handled explicitly, and the most reliable prevention is consistently acquiring locks on multiple rows in the same order everywhere in the codebase (exactly as recommended for in-memory locks in §26.3).

### 32.6 Common Mistakes and Production Debugging Signals

- Assuming "my database uses transactions" means all anomalies are prevented, without checking the actual configured isolation level — many databases default to Read Committed, which permits non-repeatable reads that can silently produce subtly incorrect business logic under concurrency.
- Writing multi-step, multi-row transactions without a consistent lock-acquisition order across the codebase, producing intermittent, load-correlated deadlock-abort errors that are difficult to reproduce outside of concurrent production traffic.
- Long-running transactions holding MVCC snapshots open for extended periods, preventing old row versions from being cleaned up (§32.4) and causing table/index bloat that degrades performance broadly, not just for the long-running transaction itself.

### 32.7 Engineering Intuition

> **How do I know my isolation level is inadequate for my use case?** Identify the specific anomaly (§32.3) your business logic cannot tolerate — e.g., "we must never let two concurrent requests both believe a seat is available and both book it" — and check whether your configured isolation level actually prevents that specific anomaly, rather than assuming "transactions" alone are sufficient.
>
> **What symptoms indicate an isolation-level problem?** Subtle, load-dependent data correctness bugs (double bookings, lost updates) that never reproduce in single-threaded testing but appear under real concurrent load — the classic signature of an isolation level weaker than the business logic actually requires.
>
> **What metrics indicate a deadlock or locking problem?** Deadlock/abort rate reported by the database, transaction retry rate, and lock wait time percentiles.
>
> **What breaks first if isolation is chosen carelessly?** Either subtle correctness bugs (too weak an isolation level for the actual business requirement) or unnecessarily poor throughput and increased deadlock/abort rates (too strict an isolation level for a workload that didn't need it).
>
> **When is Read Committed (a weaker level) actually the right choice?** For workloads where the specific anomalies it permits (non-repeatable reads) genuinely don't matter to correctness — many read-heavy, low-consistency-sensitivity workloads are well served by it, and paying for stricter isolation would be pure overhead.
>
> **What would a hyperscale company do?** Choose isolation levels deliberately, per use case, based on which specific anomalies are tolerable — using strict serializability only where its cost is clearly justified by the business requirement, and building explicit retry logic around expected, occasional deadlock aborts.
>
> **What would a two-person startup do?** Use their database's default isolation level (commonly Read Committed) for most operations, and only reach for stricter isolation or explicit locking on the specific handful of operations (like payment processing or booking) where a concrete anomaly would cause a real business problem.
>
> **What changes with scale?** At low concurrency, isolation-level choice rarely matters in practice because true conflicts are rare. Under high concurrent load on shared, frequently-updated rows, the choice of isolation level — and the presence or absence of consistent deadlock-avoidance discipline — becomes a first-order determinant of both correctness and throughput.

### 32.8 Exercises

1. A booking system allows two concurrent requests to both read "seat available," both proceed to book it, and both succeed — resulting in a double booking. Using §32.3, identify which anomaly this represents and which isolation level (or explicit locking strategy) would prevent it.
2. Explain, using §32.5, why acquiring locks in a consistent order across the entire codebase prevents deadlocks, and why a single code path that acquires locks in a different order can undermine that guarantee for the whole system.

### 32.9 Further Reading

- Jim Gray & Andreas Reuter, *Transaction Processing: Concepts and Techniques* — the foundational, exhaustive treatment of ACID and concurrency control.
- Jepsen (jepsen.io), various database analyses — real-world testing of what isolation and consistency guarantees popular databases actually deliver versus what they claim, directly relevant to §32.3's distinctions.

---
