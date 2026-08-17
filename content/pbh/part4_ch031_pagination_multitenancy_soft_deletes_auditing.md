## 31. Pagination, Locking Strategies, Multi-Tenancy, Soft Deletes & Auditing

### 31.1 The Problem: Four Distinct, Recurring Data-Layer Requirements Every Real Backend Eventually Needs

This closing Part IV chapter covers four related but distinct concerns that appear in nearly every production backend's data layer, all directly visible throughout the actual Seat Management backend's schema and repository code: returning large result sets in manageable pieces, protecting against concurrent-update conflicts on a *single* record (distinct from §27.5's booking-conflict scenario), scoping every query correctly in a system serving multiple customers from shared infrastructure, and preserving a record of what changed and when, both for recovery and for compliance.

### 31.2 Python Mechanism: Offset Pagination vs. Keyset (Cursor) Pagination

**Offset pagination** (`LIMIT 20 OFFSET 100`) is simple to implement and simple for a client to reason about ("give me page 6"), but has a real, worsening performance cost as the offset grows — the database must still count past every skipped row internally even though it doesn't return them, meaning "page 500" of a huge table can be meaningfully slower than "page 1." **Keyset (cursor) pagination** (`WHERE id > :last_seen_id ORDER BY id LIMIT 20`) instead uses the last-seen page's final value as a filter, letting the database jump directly to the right starting point via an index (§30.4) regardless of how deep into the result set that point is — consistently fast regardless of page depth, at the cost of not supporting "jump directly to page 500" the way offset pagination superficially appears to (though that appearance is often not actually needed by real UI patterns, which usually page sequentially anyway).

### 31.3 Decision Framework: Optimistic vs. Pessimistic Locking for Single-Record Updates

§27.5's `SELECT ... FOR UPDATE` is **pessimistic locking** — assume a conflict is likely and block other transactions from the start. **Optimistic locking** instead assumes conflicts are rare: read a record along with a version number (or `updated_at` timestamp), and when writing an update, include a `WHERE version = :the_version_you_read` condition — if another transaction updated the record in between (changing its version), the `UPDATE` affects zero rows, and the application detects this and can retry or surface a conflict to the user, rather than ever holding a lock at all. Optimistic locking is the better fit when genuine conflicts are infrequent (a user editing their own profile) since it avoids pessimistic locking's throughput cost under normal, conflict-free operation; pessimistic locking (§27.5) remains correct specifically when conflicts are common and expected (many users racing for one scarce seat).

### 31.4 Engineering Constraint: Multi-Tenant Data Must Be Scoped Correctly on Every Single Query, Structurally

The actual Seat Management backend's `tenant_id` column, present on nearly every table, exists to prevent one customer organization's data from ever being visible to another's — this is only a real guarantee if genuinely *every* query touching tenant-scoped data includes a `tenant_id` filter, with no exceptions, since a single missed filter is a direct data-leakage vulnerability, not a minor bug (directly the same severity classification the companion AI Systems Handbook's §54.6 assigns to cross-tenant leakage generally). The safest implementation pattern wraps every tenant-scoped repository call through a single, shared function that mandates the `tenant_id` parameter structurally (impossible to call without one) rather than trusting every individual query author to remember to add the filter by hand each time.

### 31.5 Python Mechanism: Soft Deletes Preserve Data Behind a Status Flag Instead of `DELETE`

A **soft delete** marks a row as deleted (a `status = 'DELETED'` or `deleted_at` timestamp column) rather than physically removing it via `DELETE` — directly visible in the actual backend's floor-layout `status` field (`DRAFT/PUBLISHED/ARCHIVED/DELETED`) and its guest/user `status` fields (`ACTIVE/INACTIVE`). This preserves historical data for auditing and potential recovery, and avoids the referential-integrity complications of physically deleting a row that other tables still reference via foreign key — the tradeoff is that *every* query against a soft-deletable table must remember to filter out deleted rows (`WHERE status != 'DELETED'`), exactly the same structural-consistency discipline §31.4 demands for tenant scoping, and for the same underlying reason: a single forgotten filter silently surfaces data that should be treated as gone.

### 31.6 Python Mechanism: Auditing Records Who Changed What, When

An **audit trail** — a separate log table (or the actual backend's `auth_token_events` table, specifically for authentication events) recording who performed an action and when, distinct from the current-state table itself — answers "what happened" after the fact, which the current-state table alone cannot: a `bookings` row showing `status = 'CANCELLED'` doesn't say who cancelled it or when, only an accompanying audit record does. This is directly valuable for the exact category of investigation companion §111's production-debugging exercises repeatedly relied on (reconstructing what happened during an incident), and, in regulated domains, may be a compliance requirement rather than merely a convenience.

### 31.7 Implementation

```python
# Keyset pagination (§31.2) -- consistently fast regardless of page depth
def get_bookings_page(conn, *, tenant_id: str, last_seen_id: str | None, page_size: int = 20):
    with conn.cursor() as cur:
        if last_seen_id is None:
            cur.execute(
                "SELECT id, seat_id, booking_date FROM bookings "
                "WHERE tenant_id = %s ORDER BY id LIMIT %s",
                (tenant_id, page_size),
            )
        else:
            cur.execute(
                "SELECT id, seat_id, booking_date FROM bookings "
                "WHERE tenant_id = %s AND id > %s ORDER BY id LIMIT %s",
                (tenant_id, last_seen_id, page_size),
            )
        return cur.fetchall()


# Optimistic locking (§31.3) -- no lock held; conflict detected on write
def update_profile_optimistic(conn, *, user_id: str, new_name: str, expected_version: int) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE app_users SET full_name = %s, version = version + 1 "
            "WHERE id = %s AND version = %s",
            (new_name, user_id, expected_version),
        )
        conn.commit()
        return cur.rowcount == 1     # 0 rows affected means someone else
                                       # updated it first -- a real conflict,
                                       # not a bug, surfaced explicitly
```

`get_bookings_page` uses `id > last_seen_id` (keyset pagination) rather than `OFFSET` — retrieving page 50 costs the same as page 1, since the database jumps directly via the index on `id` (§30.4) rather than counting through every earlier row. `update_profile_optimistic`'s `WHERE ... AND version = %s` clause means the `UPDATE` silently affects zero rows if another transaction already changed `version` since this one read it — `cur.rowcount == 1` is the caller's signal to distinguish "my update succeeded" from "someone else's update won the race," without ever needing to hold a lock (§31.3's tradeoff against §27.5's pessimistic alternative).

### 31.8 Production Considerations

A missing `tenant_id` filter (§31.4) or a missing soft-delete filter (§31.5) are both structurally identical failure classes — an easy-to-miss `WHERE` clause omission with a real, sometimes severe, data-exposure consequence — and both benefit from the same mitigation: a shared, mandatory-parameter helper function that every repository call goes through, making the correct filter structurally required rather than a convention every individual query author must remember unaided, directly the same discipline the companion AI Systems Handbook's §54.9 tenant-scoping wrapper demonstrates for its own domain. Optimistic locking's "zero rows affected" signal must actually be checked and acted on by calling code — silently ignoring `cur.rowcount` and assuming success regardless defeats the entire mechanism, turning a detected conflict into a silently lost update exactly as if no locking strategy existed at all.

### 31.9 Debugging

**Symptoms:** A user's profile update is silently lost after they submit a change, with no visible error; a query occasionally returns one customer's data mixed into another's results. **Investigation:** For lost updates, check whether the update path uses optimistic locking correctly (§31.3) and whether the caller actually checks the affected-row count, or whether it's a genuine last-write-wins race with no detection at all. For cross-tenant data, audit every query against the specific table for a missing `tenant_id` filter — treat this as a severity-one finding requiring immediate fix (§31.4), not a routine bug. **Root cause:** A silently-ignored optimistic-locking conflict signal, or a structurally unenforced tenant/soft-delete filter omitted on one specific query path. **Fix:** Ensure every write path using optimistic locking checks and handles a zero-affected-rows result explicitly; migrate ad hoc, per-query tenant/soft-delete filtering to a shared, structurally-mandatory helper function.

### 31.10 Interview Thinking

"How would you paginate a table with tens of millions of rows efficiently?" tests whether keyset/cursor pagination (§31.2) is your default answer for a large table, with an explicit explanation of *why* `OFFSET` degrades (the database still has to skip past every earlier row internally) — a strong answer also distinguishes this from the "optimistic vs. pessimistic locking" question (§31.3), a related but genuinely separate concurrency-control concept interviewers sometimes probe in the same conversation to check you don't conflate the two.

### 31.11 Mini Lab

Implement §31.7's `get_bookings_page` function against a table with at least 200 rows and confirm retrieving several sequential pages (each using the previous page's last `id` as the next call's `last_seen_id`) correctly returns non-overlapping, ordered results. Separately, implement `update_profile_optimistic` and, using two separate connections, read the same row's version in both, update it successfully via the first connection, then attempt to update it via the second connection using the now-stale version — confirm the second update correctly reports zero rows affected rather than silently succeeding or overwriting the first update.

---
