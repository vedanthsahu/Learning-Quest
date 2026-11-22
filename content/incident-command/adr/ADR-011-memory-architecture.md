# ADR-011 — Memory Architecture

## Status
Proposed

## Context
Memory must be categorized and lifecycle-managed, not a flat conversation dump into a vector store. See [10-memory-architecture](../10-memory-architecture.md).

## Problem
How to split responsibility between PostgreSQL (metadata, lifecycle, provenance) and Milvus (embeddings/similarity), and how to represent supersession (a newer fact replacing an older one)?

## Options considered
- **Metadata in PostgreSQL, embeddings in Milvus, linked by ID** — keeps the authoritative record (what's remembered, its status, its provenance) transactional and relationally joinable, while Milvus only ever answers similarity queries.
- **Everything in Milvus, including metadata as payload fields** — simpler (one store) but loses transactional guarantees and relational joins (e.g., "all ACTIVE memory for user X joined with their conversations") and makes lifecycle transitions harder to audit.
- **Graph memory / hybrid graph+vector** — explicitly rejected per source brief §9 ("do not implement graph memory merely because it sounds advanced"); Future/Advanced only.

## Decision
Metadata/lifecycle in PostgreSQL (`memory_records` table), embeddings in Milvus keyed by `memory_records.id`. Lifecycle: NEW → ACTIVE → UPDATED → STALE → ARCHIVED, with a `superseded_by` link for conflict provenance.

## Rationale
Matches the general PostgreSQL/Milvus responsibility split already decided in [ADR-004](ADR-004-postgresql.md)/[ADR-006](ADR-006-milvus.md) — Milvus is retrieval infrastructure, never system of record.

## Tradeoffs
Two-store consistency (a memory record and its embedding must be kept in sync) is more moving parts than a single store, but the alternative (Milvus as system of record) was explicitly rejected in the source brief.

## Consequences
Full automatic lifecycle transition/conflict-detection logic is Good to Have (see [04-must-have-vs-good-to-have](../04-must-have-vs-good-to-have.md)); Must Have is the schema shape and manual/explicit transitions.

## Reconsideration conditions
None anticipated for the storage split; conflict-detection *mechanism* specifically is still open (Q10 in [20-open-questions-and-risks](../20-open-questions-and-risks.md)).
