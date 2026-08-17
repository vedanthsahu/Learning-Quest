## §127. SQLAlchemy in Practice: Sessions, ORM Gotchas, and Alembic Migrations

### 1. The Vocabulary

- **Session** — SQLAlchemy's unit-of-work object (§119): tracks objects loaded and changed during
  one logical operation, and issues the actual SQL when committed.
- **Engine** — the object holding the actual database connection pool; typically created once per
  application, not per request.
- **Lazy loading vs eager loading** — lazy loading fetches a related object only when it's
  accessed (the mechanism behind the N+1 problem, §30); eager loading (`joinedload`,
  `selectinload`) fetches related data upfront in fewer queries.
- **Alembic** — SQLAlchemy's companion migration tool: generates versioned migration scripts from
  model changes and applies them in order, the same role Django's migrations or Flyway play for
  other stacks (see §32 for migration safety in general).

### 2. Where It Sits, and Why Teams Use It

SQLAlchemy is the dominant Python ORM, and almost every practical gotcha with it comes from
session lifecycle and lazy loading rather than from the SQL it generates being wrong. A session
tied to one request, closed at the end of that request, is the standard pattern (FastAPI's
`Depends`-based session injection, §130) — the moment an object outlives its session and something
tries to lazily load a relationship on it, that's a `DetachedInstanceError` or, worse, a silent
extra query per item in a loop.

### 3. What Actually Breaks

- **Accessing a lazy-loaded relationship outside its original session** — a `DetachedInstanceError`
  at best, or a confusing crash somewhere far from where the object was originally fetched.
- **The N+1 problem from unexamined lazy loading** — looping over a list of objects and accessing a
  lazy relationship on each triggers one query per item; invisible with 5 test rows, a real
  production incident with 5,000 (full mechanism in §30).
- **Sharing one session across concurrent requests** — sessions aren't thread-safe; a session
  created once and reused globally instead of per-request causes state to bleed between unrelated
  requests.
- **Editing the database schema by hand instead of through Alembic** — a manual `ALTER TABLE` run
  once on production, never captured as a migration, leaves every other environment's schema
  silently out of sync and future migrations built on a false assumption of the schema's shape.
- **Alembic migrations that aren't reversible or aren't tested against production-sized data** —
  the same "migration locks the table" and "no rollback path" failure modes as §32, specific to how
  easy Alembic makes it to generate a migration without reviewing what it actually does.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I scope a SQLAlchemy session to one request or one unit of work, and I don't let ORM objects
  outlive the session they were loaded in."
- "When I see a loop touching a lazy relationship, I check for N+1 first and reach for
  `selectinload`/`joinedload` if needed."
- "Every schema change goes through an Alembic migration, reviewed like any other code change —
  never a manual change applied directly to production."

### 5. Interview-Ready Answer

> "The SQLAlchemy bugs I watch for are almost always about session lifecycle, not SQL correctness —
> a session should be scoped to one request, and an object shouldn't be touched for lazy-loaded
> data after its session is closed. I check any loop over ORM objects for the N+1 pattern and use
> eager loading when it's there. And every schema change goes through Alembic as a reviewed
> migration — never a manual change applied straight to production, since that silently desyncs
> every other environment's schema from what the migration history assumes."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §25 (SQLAlchemy Core & ORM Internals) chapter and
companion Python Backend Engineering Handbook's §28 (Alembic & Migrations) chapter for full
session-management patterns and Alembic workflows; this book's §30 (N+1 problem) and §32 (safe
migrations) for the two failure modes named above in full depth.

---
