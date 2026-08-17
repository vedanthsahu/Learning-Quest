## §102. Data & Query Mysteries

*Format: Symptom → What's Actually Going On → The Fix → What to Say About It.*

### "Database migration locked production."

- **What's actually going on**: Certain schema changes (a non-concurrent index build, some
  constraint additions) hold a table-level lock for the migration's duration, blocking reads and/
  or writes against it.
- **The fix**: Use online/concurrent variants where the database supports them, and test
  migration behavior against production-scale data beforehand, not just a small dev dataset.
- **What to say**: "I'd check whether the specific migration type locks the table, and use a
  concurrent/online variant if the database supports one."
- **See also**: §32.

### "Query became slow after data grew."

- **What's actually going on**: Usually a missing index, or a query pattern (like N+1) that was
  invisible at small scale and now costs real time per additional row.
- **The fix**: Check the query's actual execution plan (`EXPLAIN`) rather than guessing; add the
  right index, or fix the query pattern.
- **What to say**: "I'd start with `EXPLAIN` on the actual query rather than guessing at the
  cause."
- **See also**: §29, §30, §34.

### "Pagination skips or duplicates records."

- **What's actually going on**: Offset-based pagination is vulnerable to rows being inserted or
  deleted between page requests, shifting what "offset 40" actually points to.
- **The fix**: Switch to cursor (keyset) pagination, which anchors to a specific value instead of
  a position.
- **What to say**: "This is a known limitation of offset pagination under concurrent writes —
  cursor pagination avoids it."
- **See also**: §21.

### "Redis cache is serving old data."

- **What's actually going on**: A write path updated the database but didn't invalidate the
  corresponding cache entry — or a different write path exists that doesn't know it needs to.
- **The fix**: Audit every code path that writes the underlying data and ensure each one also
  invalidates the relevant cache entry; consider a shorter TTL as a safety net.
- **What to say**: "I'd check every write path for this data, not just the obvious one, since
  stale cache almost always traces back to one that forgot to invalidate."
- **See also**: §39.

---
