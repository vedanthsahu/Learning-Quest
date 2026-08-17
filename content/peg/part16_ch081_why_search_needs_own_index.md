## §81. Why Search Needs Its Own Index

### 1. The Vocabulary

- **Full-text search** — finding documents by relevance to free-text query terms, not exact field
  matches.
- **Search index** — a data structure (often an inverted index — see the DSA Handbook) built
  specifically to answer "which documents contain these terms" quickly, maintained separately
  from the primary database.
- **Reindexing** — rebuilding the search index, needed when the underlying data or index
  structure changes significantly.
- **Relevance ranking** — ordering results by how well they match the query, not just whether
  they match at all — the thing a plain database query has no built-in concept of.

### 2. Where It Sits, and Why Teams Use It

A relational database is built for exact-match and range queries against structured columns; it's
fundamentally the wrong tool for "find documents whose free text is relevant to these words,
ranked by relevance" — which is exactly the gap dedicated search engines (Elasticsearch/
OpenSearch) fill.

### 3. What Actually Breaks

- **Trying to fake full-text search with `LIKE '%term%'`** — technically finds substring matches,
  but has no relevance ranking, is slow at scale (can't use a normal index efficiently), and can't
  handle things like stemming (matching "running" to a search for "run") at all.
- **A search index that's out of sync with the actual database** — since the index is a separate
  copy maintained alongside the primary data, anything that updates the database without also
  updating (or triggering a reindex of) the search index leaves search results stale or missing
  newly-created records (see §108).
- **Dual-write inconsistency** — writing to the database and the search index as two independent,
  unguarded steps has the same "what if the process crashes between them" problem the outbox
  pattern (§46) solves for other event-publishing scenarios.
- **Reindexing a large dataset with no plan for the downtime/load it causes** — a full reindex of
  a large index is a real, resource-intensive operation that needs to be planned, not run
  casually on a live system.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "A database `LIKE` query is not full-text search — no relevance ranking, no stemming, and it
  doesn't scale the same way."
- "A search index is a separate copy of the data, and I need an explicit, reliable mechanism
  keeping it in sync with the source of truth, not just an initial one-time load."
- "I plan reindexing operations deliberately, since they're resource-intensive at any real scale."

### 5. Interview-Ready Answer

> "A database is built for exact-match and range queries against structured columns — it has no
> real concept of relevance ranking or full-text matching, which is exactly what a dedicated
> search index like Elasticsearch or OpenSearch is built for. The part that actually needs careful
> design is keeping that separate index in sync with the source-of-truth database — since they're
> two different systems, an update to one without a reliable mechanism to also update the other is
> exactly how 'search doesn't find my new document' bugs happen."

### 6. Go Deeper

companion Cloud Engineering Playbook's §25 (OpenSearch Service) chapter; companion DSA
Engineering Handbook's §53 (Elasticsearch: Inverted Indexes & Tries) chapter (inverted indexes and
tries in full).

---
