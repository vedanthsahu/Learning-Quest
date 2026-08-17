## 6. Mental Model: Data Storage — From Files to Transactions

### 6.1 Why This Chapter Starts With Files, Not Databases

Per the ordering philosophy in §0.1, a database is not the starting point of this story — it is the *answer* to a sequence of problems that appear the moment you try to store and retrieve data reliably, starting from the simplest possible mechanism: a file. Walking that sequence is the fastest way to understand what a database actually buys you, instead of treating "use a database" as an unexamined default. Mechanisms (B-Trees, LSM-Trees, write-ahead logs, isolation levels) are deferred to Pass 2, §31–32.

### 6.2 Stage 1: Just Use a File

The simplest possible durable storage mechanism is a file: append records to it, read it back later. This works, and for genuinely simple, single-writer use cases, it is not a wrong answer — it is Stage 0 of Part IV's capstone project (§81) in miniature. But three problems appear almost immediately once more than trivial demands are placed on it.

### 6.3 Problem 1: Finding Anything Is Slow

To find one specific record in a file, you must, in the worst case, read the entire file from the start, comparing every record until you find the one you want. This cost grows linearly with the file's size — acceptable for a hundred records, unusable for a hundred million. The natural fix is to build a separate, smaller structure that maps a lookup key directly to the location of the matching record in the file, so a search touches that structure instead of scanning everything. This is the conceptual seed of an **index** — and the reason indexes exist is entirely to avoid the linear scan this section just described. (The actual data structures used, chiefly B-Trees and LSM-Trees, are covered in §31.)

### 6.4 Problem 2: An Index Introduces a New Kind of Bug

The moment you maintain an index alongside the actual data, you have created two things that must agree with each other — the data file and the index pointing into it. If a program crashes, or two operations happen concurrently, halfway through updating both, the index and the data can end up disagreeing: the index might point to a record that no longer exists, or fail to point to one that does. This is a **failure of coordination** in the taxonomy from §1.3.2, now appearing inside a single machine's storage layer rather than across a network. The fix, developed at the mechanism level in §31–32, is to make updates to related pieces of storage happen as a single, indivisible unit — which is the conceptual origin of a **transaction**.

### 6.5 Problem 3: Concurrent Access Multiplies the Bug Surface

Once more than one program (or more than one thread within a program) can read and write the same stored data at the same time, the coordination problem in §6.4 gets dramatically worse: two writers can interleave their operations in ways that corrupt data neither one intended, or a reader can observe data mid-update, in a state that never should have been visible to anyone. This is the same class of problem as thread-level memory races from §2.4, now happening over durable storage instead of in-memory variables, and it is why transactions come with a notion of **isolation** — a promise about what concurrent operations are and are not allowed to see of each other's in-progress work. (Isolation levels, and the very real performance cost of stronger ones, are covered mechanically in §32.)

### 6.6 Problem 4: What Happens When the Machine Crashes Mid-Write?

A write to durable storage is not instantaneous — it takes real time to physically commit, and a machine can lose power, crash, or be killed at any point during that window. A storage system that cannot guarantee that a write either fully happened or didn't happen at all — with no possibility of a half-finished, corrupted result surviving a crash — is not durable in any meaningful sense, no matter how confidently it names itself a "database." This is the problem that recovery mechanisms (chiefly the **write-ahead log**, covered in §31) exist to solve: recording intent durably *before* acting, so that after a crash, the system can replay or discard incomplete operations and arrive at a state that is guaranteed to be one of "before" or "after," never something in between.

### 6.7 Putting It Together: What a Database Actually Is

Once you have walked through §6.2–6.6, a database is best understood not as a magical black box but as the accumulated engineering answer to exactly these four problems: fast lookup (indexes), atomic multi-part updates (transactions), safe concurrent access (isolation), and crash safety (durability via write-ahead logging and recovery). Every relational database you will ever use is, at its foundation, a very sophisticated, battle-tested answer to "how do I avoid writing §6.2 through §6.6 myself, badly." This framing is exactly why §7 introduces relational and NoSQL databases as different *tradeoffs* over this same foundational problem set, rather than as a menu of unrelated products.

### 6.8 Engineering Intuition

> **How do I know I need to think about these foundational storage problems directly, rather than trusting "the database handles it"?** The moment you are choosing isolation levels, batching multi-step operations, or reasoning about what a client should see if a request fails halfway through — you are directly exercising the guarantees this chapter introduced, and treating them as automatic without understanding them is how subtle data-corruption bugs get shipped.
>
> **What symptoms indicate one of these foundational guarantees is missing or misunderstood?** "Impossible" data states in production (an order marked paid with no corresponding payment record); intermittent data corruption that only appears under concurrent load; a multi-step operation that leaves the system in a partially-updated state after a crash or failed request.
>
> **What metrics indicate it?** Rate of orphaned or inconsistent records found by data-integrity audits; frequency of manual data-repair scripts required in production.
>
> **What breaks first if this mental model is ignored?** Multi-step business operations (place an order, charge a card, decrement inventory) implemented as separate, uncoordinated writes — which is exactly the §6.4 coordination problem, and the direct cause of a large share of "how did the data get like this" incidents.
>
> **When is it acceptable to skip formal transactional guarantees?** Genuinely single-writer, low-stakes, easily-reconstructible data (a local cache of non-critical, re-fetchable information) — the cost of full transactional rigor is not always worth paying, and Stage 0 of the capstone project (§81) deliberately does not over-engineer this.
>
> **What would a hyperscale company do?** Use transactions deliberately and sparingly at the boundaries that truly need atomicity, while relying on patterns like the outbox pattern (§41) to coordinate consistency *across* separate storage systems, since a single ACID transaction cannot span two different databases.
>
> **What would a two-person startup do?** Use whatever transactional guarantees their chosen managed database provides by default, and not think about isolation levels until a specific concurrency bug forces the question.
>
> **What changes with scale?** At small scale, a single database's built-in transaction support is more than sufficient. At large scale, data is spread across many databases and services (§8, §35), and maintaining §6.4's coordination guarantee *across* those boundaries becomes one of the hardest and most consequential problems in the entire book (§41, distributed transactions and sagas).

### 6.9 Exercises

1. Without naming any specific database product, explain in your own words why an index can become "wrong" if a crash happens at the wrong moment, and what property would prevent that.
2. Describe a multi-step operation in a system you know (e.g., "transfer funds between two accounts") and identify exactly which of §6.2–6.6's four problems each step is vulnerable to if not handled carefully.

### 6.10 Further Reading

- Martin Kleppmann, *Designing Data-Intensive Applications*, Chapters 1–3 — the closest existing text to this chapter's own philosophy of building up storage guarantees from first principles; required reading before §31–32.
- Jim Gray & Andreas Reuter, *Transaction Processing: Concepts and Techniques* — the foundational, exhaustive treatment of exactly the problems in §6.4–6.6.

---
