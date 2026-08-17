## 30. Query Optimization, Indexes & the N+1 Problem

### 30.1 The Problem: A Query That's Fast at 100 Rows Can Be Unusable at 10 Million

A query tested during development against a small, sparse table can look completely fine and still become a severe production bottleneck once the table holds real, production-scale data — this isn't a coding mistake in the ordinary sense, it's a mismatch between what was tested and what's actually deployed against, and it's exactly why query performance must be reasoned about structurally (what will the database actually have to do to answer this), not just observed empirically against unrepresentative test data — directly the same "unrepresentative test" lesson companion §113.3's migration case study taught, now applied to everyday query-writing rather than a one-time migration.

### 30.2 Python Mechanism: `EXPLAIN ANALYZE` Reveals What the Database Actually Does

PostgreSQL's `EXPLAIN ANALYZE <query>` runs the query and reports the actual execution plan it used — whether it scanned the entire table (a **sequential scan**) or used an index to jump directly to relevant rows (an **index scan**), how many rows were actually examined at each step, and how long each step took. This is the primary diagnostic tool for query performance, and reading its output (recognizing "Seq Scan on bookings (cost=... rows=1000000)" as a red flag for a query that should only need a handful of rows) is a directly learnable, high-leverage skill distinct from general Python profiling (companion §54).

### 30.3 Engineering Constraint: An Index Trades Write Cost and Storage for Read Speed

An **index** is a separate, ordered data structure (commonly a B-tree, companion §31's storage-engine chapter develops the mechanism) that lets the database find rows matching a condition on the indexed column(s) without scanning the entire table — but every index must itself be updated on every `INSERT`/`UPDATE`/`DELETE` touching the indexed column, and consumes its own storage. This is a genuine tradeoff, not a free win: a table with many indexes on rarely-queried columns pays a real, ongoing write-performance cost for read-speed benefit that's never actually used, exactly the kind of decision that should be justified by an actual, observed query pattern (§30.2's `EXPLAIN` output showing a sequential scan on that specific column), not added speculatively.

### 30.4 Decision Framework: Index the Columns Actually Used in `WHERE`, `JOIN`, and `ORDER BY` Clauses

The specific, learnable rule: a column appearing in a `WHERE` filter, a `JOIN` condition, or an `ORDER BY` clause on a large, frequently-queried table is a strong candidate for an index; a column never used to filter, join, or sort (only ever selected, never filtered on) generally isn't. The actual Seat Management backend's `bookings` table being queried by `seat_id`, `tenant_id`, and `booking_date` together (§27.6's `FOR UPDATE` query) is a direct signal that a composite index on `(tenant_id, seat_id, booking_date)` is very likely warranted, precisely because that exact combination is the query's actual filter condition.

### 30.5 The N+1 Problem, Revisited With Its Full Diagnostic Method

§25.5 and §25.7 introduced the N+1 problem as an ORM-specific risk; the same failure shape occurs identically in raw-SQL/repository code whenever a loop calls a per-item query instead of one batched query — a loop over a list of bookings, calling `get_seat_details(seat_id)` once per booking inside the loop, issues one query per booking rather than one query for all needed seats together. The fix is the same regardless of ORM or raw SQL: replace the per-item query inside the loop with a single query using `WHERE seat_id = ANY(%s)` (or an equivalent `IN (...)` clause) against the full batch of needed IDs collected upfront, then match results back to their original items in Python.

### 30.6 Implementation

```python
# THE PROBLEM: N+1 -- one query per booking, inside a loop
def get_bookings_with_seat_codes_slow(conn, booking_ids: list[str]) -> list[dict]:
    bookings = get_bookings_by_ids(conn, booking_ids)   # 1 query
    for booking in bookings:
        seat = get_seat_by_id(conn, booking["seat_id"])  # N queries -- ONE
        booking["seat_code"] = seat["seat_code"]           # PER BOOKING (§30.5)
    return bookings


# THE FIX: batch the second query using a single IN/ANY clause
def get_bookings_with_seat_codes_fast(conn, booking_ids: list[str]) -> list[dict]:
    bookings = get_bookings_by_ids(conn, booking_ids)        # 1 query
    seat_ids = list({b["seat_id"] for b in bookings})         # de-duplicated
                                                                 # batch of IDs

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, seat_code FROM seats WHERE id = ANY(%s)",  # 1 query,
            (seat_ids,),                                            # NOT N
        )
        seat_code_by_id = {row[0]: row[1] for row in cur.fetchall()}

    for booking in bookings:
        booking["seat_code"] = seat_code_by_id[booking["seat_id"]]
    return bookings

def get_bookings_by_ids(conn, ids): ...
def get_seat_by_id(conn, seat_id): ...
```

`get_bookings_with_seat_codes_slow` issues exactly one query per unique booking in the list, inside the `for` loop — with 500 bookings, that's 501 total queries, each with its own network round-trip, dominating the function's total latency far more than the actual amount of data being retrieved would justify. `get_bookings_with_seat_codes_fast` collects every needed `seat_id` first, issues *one* query using `= ANY(%s)` to fetch every needed seat in a single round-trip, then matches results back in Python using a dict lookup — reducing the total query count from 501 to exactly 2, regardless of how many bookings are in the list.

### 30.7 Production Considerations

`EXPLAIN ANALYZE` should be run against production-representative data volume (companion §118.4's environment-parity principle, applied specifically to query performance) — a query plan chosen by PostgreSQL's optimizer can genuinely change as table size grows (a sequential scan can be faster than an index scan for a very small table, and the optimizer knows this; the same query might correctly switch to an index scan once the table grows large enough), meaning a query validated as "fast" against a small development database provides limited confidence about its behavior at real scale. N+1 patterns are particularly dangerous specifically because they're invisible in low-volume testing (a loop over 3 test bookings issuing 3 extra queries feels indistinguishable from 1) and only become a visible problem once a list genuinely has hundreds or thousands of items — precisely the gap between test data and production data §30.1 opened this chapter with.

### 30.8 Debugging

**Symptoms:** An endpoint returning a list of items becomes measurably slower specifically as the list size grows, in a way that looks roughly linear with the number of items rather than roughly constant. **Investigation:** Enable query logging (or use `EXPLAIN ANALYZE` directly) for the specific endpoint and count actual queries issued for a request with a known list size — a query count that scales with the list size, rather than staying constant (or growing only with the number of distinct *types* of related data needed, not the number of items), is the direct N+1 signature (§30.5), regardless of whether the code uses an ORM or raw SQL. **Root cause:** A per-item query inside a loop, rather than one batched query using the full set of needed IDs collected upfront. **Fix:** Restructure the loop to collect all needed identifiers first, issue one batched query (`= ANY(...)` / `IN (...)`) for all of them together, then match results back to each item in Python, exactly as §30.6 demonstrates.

### 30.9 Interview Thinking

"This endpoint returning a list of 1000 items takes 8 seconds — how do you investigate?" is testing whether N+1 (§30.5) is near the top of your default diagnostic checklist for exactly this symptom shape (latency scaling with result-set size) — a strong answer proposes checking actual query counts first (via logging or `EXPLAIN ANALYZE`) rather than jumping straight to adding an index or a cache, since neither of those fixes an N+1 problem at its actual root cause.

### 30.10 Mini Lab

Implement both `get_bookings_with_seat_codes_slow` and `_fast` from §30.6 against a local database with at least 100 test bookings spread across a smaller number of distinct seats. Enable query logging (or wrap each with a simple query-counting decorator, companion §2.6's decorator pattern applied here) and confirm the slow version's query count scales with the number of bookings while the fast version's stays constant at 2, regardless of how many bookings are requested.

---
