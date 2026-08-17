## 33. Query Processing: Query Planning, Indexing Strategies, EXPLAIN, N+1, Join Algorithms

### 33.1 What This Chapter Adds to §6-7

§6-7 established why indexes exist and why relational databases support joins. This chapter covers how a database actually decides *how* to execute a given query, how to read that decision, the specific indexing strategies beyond a single-column B-Tree, and the notorious N+1 query problem.

### 33.2 The Query Planner: Turning "What" Into "How"

When a database receives a SQL query, it does not execute it literally as written — a **query planner** first considers multiple possible execution strategies (which index to use, if any; which order to join tables in; which join algorithm to use) and estimates the cost of each, using statistics it maintains about table sizes and data distribution, before choosing the plan it believes will be cheapest. This is why the same logical query can perform very differently depending on data volume and distribution — the planner's choice is a prediction based on statistics, and a plan that was optimal at one data size or distribution can become badly suboptimal as the data changes, without any change to the query itself.

### 33.3 EXPLAIN: Making the Planner's Decision Visible

Every major relational database provides an `EXPLAIN` (or `EXPLAIN ANALYZE`) command that reveals the actual plan chosen for a given query — which indexes (if any) are used, what join algorithm connects each pair of tables, and the planner's estimated versus (with `ANALYZE`) actual row counts at each step. Reading an `EXPLAIN` output is the single most direct way to answer "why is this specific query slow": a **sequential scan** appearing where an index lookup was expected almost always points to a missing or unusable index; a large discrepancy between estimated and actual row counts points to stale statistics misleading the planner into a bad choice. This is the concrete, hands-on tool that operationalizes the observability principle from §16 specifically for query performance — instead of guessing why a query is slow, you can see exactly what the database chose to do and why.

### 33.4 Indexing Strategies Beyond a Single Column

§6.3 introduced the index concept generically. In practice, several distinct indexing strategies exist, each suited to a different query shape:

- **Composite (multi-column) indexes**: an index on `(column_a, column_b)` speeds up queries filtering on `column_a` alone, or on both columns together, but generally does *not* speed up a query filtering on `column_b` alone — column order in a composite index matters, and should match the most common query patterns.
- **Covering indexes**: an index that includes every column a query needs, so the database can answer the query directly from the index itself without a further lookup into the underlying table (avoiding an extra disk read per matching row) — highly effective for frequently-run, narrow queries.
- **Partial indexes**: an index built over only a subset of rows matching some condition (e.g., only rows where `status = 'active'`), dramatically smaller and faster than a full-table index when queries consistently filter on that same condition.

The unifying principle, extending §6.3's original motivation: an index is only useful for the specific access patterns it was designed around, and adding indexes indiscriminately has a real cost — every additional index slows down writes (each write must also update every index on the affected table) and consumes additional storage, so indexing strategy is itself a tradeoff (§1.7), not a free performance win to maximize without limit.

### 33.5 Join Algorithms: How Two Tables Actually Get Combined

Given a query joining two tables, the planner (§33.2) chooses among several concrete algorithms:

- **Nested loop join**: for each row in the first table, scan the second table for matching rows. Simple, and efficient when one side is small or a good index exists on the join column of the second table — but degrades badly (quadratic-ish cost) without such an index.
- **Hash join**: build an in-memory hash table from the smaller of the two tables (keyed by the join column), then scan the larger table once, probing the hash table for matches. Efficient for large, unindexed joins, at the cost of requiring enough memory to hold the hash table.
- **Merge join**: if both tables are already sorted by the join column (or can be cheaply sorted), scan both simultaneously, advancing whichever side has the smaller current value — efficient specifically when the sorted-order precondition is cheaply available (e.g., both sides already indexed on the join column).

The planner picks among these based on estimated table sizes, available indexes, and available memory — precisely the kind of decision `EXPLAIN` (§33.3) reveals, and precisely why the "same" join can be fast in one context and slow in another depending on which algorithm the planner actually selects.

### 33.6 The N+1 Query Problem: A Correctness-Adjacent Performance Bug

A specific, extremely common application-layer mistake: fetching a list of N parent records with one query, then, for each parent record, issuing a *separate* query to fetch its related child data — resulting in 1 + N total queries where a single, properly-joined query (or a single batched query using an `IN` clause) would suffice.

```
N+1 pattern (the mistake):
    orders = SELECT * FROM orders WHERE user_id = 123      -- 1 query
    for order in orders:
        items = SELECT * FROM order_items WHERE order_id = order.id  -- N queries

Fix (one of several):
    SELECT * FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = 123                                   -- 1 query total
```

This pattern is dangerous precisely because it is invisible in small-scale testing (with a handful of orders, the difference between 1 query and 11 queries is imperceptible) and becomes a severe, often production-incident-triggering performance problem exactly when a list grows large — directly connecting to §29.5's warning about GraphQL resolvers independently fetching nested data, where the N+1 pattern is an especially easy trap to fall into because each field resolver is written in isolation, with no visibility into how many times it will actually be invoked.

### 33.7 Common Mistakes and Production Debugging Signals

- Adding a single-column index and expecting it to accelerate a query that filters on a different column, or on a different-order combination in a composite index (§33.4) — visible immediately in `EXPLAIN` output as an unexpected sequential scan.
- Trusting a query plan from months ago without re-checking it as data volume grows — planner statistics and chosen plans can and do change as tables grow, and a query that was fast at launch can silently degrade as a table's size crosses a threshold that changes the planner's cost estimates.
- Shipping an ORM-generated data-access pattern without checking the actual SQL it produces — many N+1 problems (§33.6) originate from an object-relational mapper's default "lazy loading" behavior, invisible unless the generated queries are actually inspected.

### 33.8 Engineering Intuition

> **How do I know a query is suffering from a planning or indexing problem?** Run `EXPLAIN ANALYZE` and check for a sequential scan on a large table where an index lookup was expected, or a large gap between the planner's estimated and actual row counts.
>
> **What symptoms indicate an N+1 problem specifically?** Query count (not query duration) scaling linearly with the number of items in a returned list — visible directly in request tracing (§16.3) as many near-identical queries fired in a tight loop for a single logical request.
>
> **What metrics indicate it?** Queries-per-request as a tracked metric (not just total query time) — a request that fires hundreds of trivial queries is a strong N+1 signal even if each individual query is fast.
>
> **What breaks first if this isn't monitored?** A feature that performs fine in development and small-scale testing degrades sharply and often triggers an incident the first time it's exercised against a genuinely large dataset in production.
>
> **When is adding another index not the right fix?** When write throughput on the table is already a bottleneck — every additional index adds write-side cost (§33.4), and a query problem might be better solved by restructuring the query or the data model than by adding yet another index.
>
> **What would a hyperscale company do?** Continuously monitor query plans and per-request query counts as first-class operational metrics, and enforce code-review or automated checks specifically for N+1 patterns before they reach production.
>
> **What would a two-person startup do?** Periodically run `EXPLAIN` on their handful of most important queries and fix egregious sequential scans, without building continuous automated query-plan monitoring.
>
> **What changes with scale?** At small data volumes, nearly any query plan and even N+1 patterns perform acceptably, because every table fits comfortably in memory (§31.6) and query counts are low. As data volume and request rate grow, planner choices and per-request query counts become directly responsible for whether the system remains responsive at all.

### 33.9 Exercises

1. Given a query that returns a sequential scan in `EXPLAIN` despite an index existing on the filtered column, list at least two possible explanations (from §33.2-33.4) for why the planner chose not to use that index.
2. Identify a list-rendering feature in a system you know that fetches related data per item in a loop. Rewrite the access pattern, per §33.6, to use a single batched or joined query instead, and explain why the fix's benefit would be invisible in small-scale local testing.

### 33.10 Further Reading

- Markus Winand, *SQL Performance Explained* — a focused, practitioner-level treatment of indexing strategies and join algorithms directly extending §33.4-33.5.
- PostgreSQL Official Documentation, "Using EXPLAIN" — a concrete, hands-on guide to reading query plans as described in §33.3.

---
