## §36. UUID vs Auto-Increment IDs, JSON Columns, and Composite Indexes

### 1. The Vocabulary

- **Auto-increment ID** — a simple, sequential integer primary key (1, 2, 3, ...).
- **UUID** — a 128-bit identifier, effectively globally unique without any central coordination.
- **JSON/JSONB column** — storing a flexible, semi-structured blob directly in a relational
  column instead of a fully normalized set of tables.
- **Composite index** — a single index built across multiple columns together, where column
  *order* changes which queries it can actually help.

### 2. Where It Sits, and Why Teams Use It

These are the recurring "which way do I model this" decisions that come up in almost every schema
design, each with a real tradeoff that isn't obvious until it bites.

### 3. What Actually Breaks

- **Auto-increment IDs leaking information** — a sequential ID exposed in a public URL reveals
  roughly how many records exist and lets someone guess adjacent IDs (`/orders/1042` implies
  `/orders/1041` probably exists) — a real, if mild, information-disclosure and enumeration risk.
- **UUIDs hurting index locality** — a random UUID primary key means new rows insert at
  effectively random positions in the index rather than at the end, causing more index
  fragmentation and slightly worse write performance than a sequential ID at scale (this is the
  same B+Tree insertion-order issue covered in companion DSA Engineering Handbook's §46
  (MySQL/InnoDB: Clustered Indexes & the B+Tree-as-Storage Model) chapter).
- **Overusing a JSON column to avoid "designing a real schema"** — flexible at first, but querying
  or indexing specific fields inside a JSON blob is slower and clumsier than a proper column, and
  it's easy to end up with inconsistent shapes inside the same column over time with no schema
  enforcement.
- **Composite index built in the wrong column order** — an index on `(status, created_at)` helps
  queries filtering by `status` (with or without `created_at`), but does *not* efficiently help a
  query that filters by `created_at` alone — index column order has to match actual query
  patterns.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I don't expose sequential auto-increment IDs directly in public URLs if enumeration or
  information disclosure is a concern — a UUID or a separate public-facing slug is the fix."
- "UUIDs are great for avoiding coordination and merge conflicts across systems, but they have a
  real write-performance cost as a primary key at large scale, compared to sequential IDs."
- "JSON columns are a reasonable escape hatch for genuinely flexible, rarely-queried data — not a
  substitute for modeling data that's actually queried or filtered on regularly."
- "Composite index column order has to match how queries actually filter, leftmost column first."

### 5. Interview-Ready Answer

> "I pick auto-increment IDs when write performance and index locality matter and the ID never
> needs to be generated outside a central database; I pick UUIDs when I need to generate IDs in
> multiple places without coordination, accepting a small write-performance cost. For JSON
> columns, I use them for data that's genuinely flexible and rarely queried directly — the moment
> I'm regularly filtering or indexing a specific field inside that blob, that's a sign it should
> be a real column instead."

### 6. Go Deeper

companion DSA Engineering Handbook's §14 (B-Trees) and companion DSA Engineering Handbook's §46
(MySQL/InnoDB: Clustered Indexes & the B+Tree-as-Storage Model) chapters (why UUID insertion order
affects index performance); companion Python Backend Engineering Handbook's §38 (Structured Data
Formats: CSV, Excel, JSON, XML & ZIP) chapter (JSON column patterns).

---
