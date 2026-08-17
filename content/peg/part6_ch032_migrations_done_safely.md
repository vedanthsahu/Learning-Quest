## §32. Database Migrations Done Safely

### 1. The Vocabulary

- **Migration** — a versioned, scripted schema change (add a column, create a table, add an
  index) applied in order, tracked so every environment ends up with the same schema.
- **Backward-compatible migration** — a schema change that both the old and new versions of the
  application code can work with at the same time.
- **Backfill** — populating a new column or table with derived/historical data after it's been
  added.
- **Zero-downtime migration** — a sequence of smaller, backward-compatible steps that together
  achieve a change that would be unsafe to do in one shot.

### 2. Where It Sits, and Why Teams Use It

The moment a system is running in production with real traffic and can't be paused for a schema
change, migrations stop being "just run a script" and start requiring real sequencing discipline
— directly connected to §14's point that a rolling or blue-green deploy runs old and new code
side by side.

### 3. What Actually Breaks

- **A migration that locks a large table** — adding certain kinds of constraint or a non-
  concurrent index build can lock an entire table for the duration, meaning every read and write
  against it queues up or times out — a genuine, common way a "routine" migration becomes a
  production incident.
- **Adding a NOT NULL column with no default, on an existing table with rows** — the migration
  either fails outright or requires backfilling every existing row first; the safe order is: add
  the column as nullable, backfill it, *then* add the NOT NULL constraint.
- **Renaming or dropping a column while old code still runs** — during a rolling deploy, the old
  code is still reading/writing the old column name; the safe pattern is add-new, dual-write,
  migrate reads, then remove-old, across multiple deploys — not a single atomic rename.
- **Running a large backfill in one transaction** — locks the whole affected range for the
  duration and risks running out of memory or timing out; large backfills are usually batched in
  small chunks with pauses between them.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I add nullable, backfill, then constrain — not NOT NULL in one step on a table with existing
  data."
- "A column rename during a live deploy is really a multi-step migration: add the new column,
  dual-write to both, migrate reads over, then drop the old one — not a single atomic rename."
- "I check whether an index build or constraint addition on a large table needs to be done
  concurrently/online, specifically to avoid locking it for the duration."

### 5. Interview-Ready Answer

> "The core discipline is that a migration and the application code that depends on it usually
> can't deploy atomically together, because of rolling deploys — so any schema change has to
> tolerate both the old and new code running simultaneously for a while. That's why I break risky
> changes like a rename into multiple backward-compatible steps, why I add nullable columns and
> backfill before adding constraints, and why I specifically check whether an index build or
> constraint on a large table will lock it for the duration."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §24 (PostgreSQL for Backend Engineers) chapter and
companion Python Backend Engineering Handbook's §30 (Query Optimization, Indexes & the N+1
Problem) chapter; companion Software Systems Handbook's §32 (Transactions & Concurrency Control:
ACID, isolation, MVCC) chapter.

---
