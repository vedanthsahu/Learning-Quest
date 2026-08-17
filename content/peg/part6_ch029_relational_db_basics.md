## §29. Relational Database Basics: Tables, Keys, Indexes

### 1. The Vocabulary

- **Table, row, column** — the basic structure: a table of typed columns, each row one record.
- **Primary key** — the unique identifier for a row.
- **Foreign key** — a column referencing another table's primary key, enforcing that a related
  row actually exists.
- **Index** — a separate, sorted data structure pointing back to table rows, letting the database
  find matching rows without scanning the whole table.
- **ORM (Object-Relational Mapper)** — a library that lets you work with rows as objects instead
  of writing raw SQL directly.

### 2. Where It Sits, and Why Teams Use It

This is the substrate almost every backend service is built on. Understanding it at even a
basic level is what separates "the ORM does something and I trust it" from actually being able to
reason about why a query is slow or a constraint is failing.

### 3. What Actually Breaks

- **Missing an index on a frequently-queried column** — the database falls back to scanning every
  row (a "full table scan"), which is fine at 100 rows and a real production incident at 10
  million.
- **A foreign key without an index on it** — the constraint itself works, but every join or
  cascading delete against that relationship is slow, because the referencing column has no fast
  lookup path of its own.
- **Adding an index "just in case" on a write-heavy table** — every index speeds up reads matching
  it but slows down every write to that table, since the index has to be updated too; indexes are
  not free.
- **Assuming the ORM writes an efficient query** — an ORM can generate a technically-correct but
  very inefficient query (see §30 for the classic N+1 case) if you don't understand roughly what
  SQL it's producing underneath.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Indexes speed up reads that filter/sort on the indexed column, at the cost of slightly slower
  writes to that table — it's a tradeoff, not a free win."
- "I check that foreign key columns are indexed, not just that the constraint exists."
- "I periodically check what SQL my ORM is actually generating for anything performance-
  sensitive, rather than trusting it blindly."

### 5. Interview-Ready Answer

> "A relational database organizes data into tables with typed columns, related to each other via
> foreign keys, and indexes are what let it find matching rows quickly instead of scanning
> everything. The tradeoff I keep in mind is that every index speeds up matching reads but slows
> down writes to that table, so I add them deliberately based on actual query patterns, not
> preemptively on every column."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §24 (PostgreSQL for Backend Engineers) chapter;
companion DSA Engineering Handbook's §14 (B-Trees) chapter (the structure most database indexes
are actually built on).

---
