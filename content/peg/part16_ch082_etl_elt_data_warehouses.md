## §82. ETL/ELT, Data Warehouses, and Data Freshness

### 1. The Vocabulary

- **ETL (Extract, Transform, Load)** — pull data from a source, transform it into the target
  shape, then load it into the destination.
- **ELT (Extract, Load, Transform)** — load raw data first, transform it afterward inside the
  destination system — increasingly common now that warehouses have enough compute to do
  transformation themselves.
- **Data warehouse** — a database optimized for analytical queries across large historical
  datasets (OLAP), as opposed to a transactional database (OLTP) optimized for fast individual
  reads/writes.
- **Data freshness** — how up-to-date the data in the warehouse is relative to the live
  transactional source — batch pipelines are often hours behind by design, not by accident.

### 2. Where It Sits, and Why Teams Use It

Running heavy analytical queries directly against a production transactional database competes
with the application's own real-time traffic for the same resources; a separate warehouse, fed by
a pipeline, exists specifically to move that analytical load somewhere it can't hurt production.

### 3. What Actually Breaks

- **Running big analytical queries against the production OLTP database** — a report or dashboard
  query scanning millions of rows can degrade performance for the actual application's real users
  sharing that same database.
- **Assuming warehouse data is real-time** — most ETL/ELT pipelines run on a schedule (hourly,
  nightly); a dashboard built on warehouse data reflecting yesterday's numbers isn't broken, it's
  working as designed — but that needs to be communicated clearly, not discovered as a surprise.
- **Late-arriving events breaking assumptions** — a pipeline that assumes all of "yesterday's"
  events arrived by the time it runs can miss events that were delayed (a mobile client offline
  and syncing late, for instance), producing quietly incomplete data.
- **No deduplication in the pipeline** — a source system retry or an at-least-once delivery
  guarantee (§44) upstream can result in the same event landing in the warehouse more than once
  if the pipeline doesn't explicitly deduplicate.
- **Schema evolution breaking downstream consumers** — a source system adding, renaming, or
  changing a field's type can silently break a pipeline or a downstream report that assumed the
  old shape, similar in spirit to §23's API versioning concerns but for data pipelines.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I keep heavy analytical queries off the production transactional database entirely — that's
  what a warehouse and a pipeline are for."
- "I'm explicit about data freshness/latency expectations for anything warehouse-backed, rather
  than letting people assume it's real-time."
- "I design pipelines to handle late-arriving events and duplicate delivery, not assume clean,
  once-only, on-time data."

### 5. Interview-Ready Answer

> "The core reason a data warehouse exists separately from the production database is resource
> isolation — heavy analytical queries shouldn't compete with real application traffic for the
> same database. The practical things I watch for in the pipeline feeding it are freshness
> expectations being explicit rather than assumed, and the pipeline itself handling late-arriving
> events and potential duplicate delivery gracefully, since the upstream systems feeding it often
> only guarantee at-least-once delivery, not exactly-once and on-time."

### 6. Go Deeper

companion Software Systems Handbook's §20 (Mental Model: Data Pipelines & Streaming) chapter and
companion Software Systems Handbook's §53 (Data Pipelines Deep Dive) chapter (ETL/ELT, batch/
streaming frameworks, exactly-once semantics in full).

---
