# ADR-004 — PostgreSQL as System of Record

## Status
Proposed

## Context
The system needs a relational store of record for users/roles/permissions/sessions/conversations/messages/memory metadata/tool metadata/audit. See [08-data-architecture](../08-data-architecture.md).

## Problem
Which relational database, and does everything belong in it?

## Options considered
- **PostgreSQL** — explicitly named in the source brief; mature, supports the relational integrity RBAC and ownership checks depend on; has a vector extension (pgvector) available as a fallback if Milvus proves too heavy (see [ADR-006](ADR-006-milvus.md)).
- **MySQL/other RDBMS** — not raised in the source brief; no stated reason to deviate.
- **Forcing every piece of state into Postgres** — explicitly rejected per source brief §11; large artifacts belong in S3, embeddings belong in Milvus.

## Decision
PostgreSQL as the sole system of record for structured, relational, transactional data; explicitly not the home for embeddings or large binary artifacts.

## Rationale
RBAC and resource-ownership enforcement ([15-security-and-rbac](../15-security-and-rbac.md)) depend on relational integrity and query-time filtering that a document/NoSQL store would make harder to reason about correctly. No competing option was raised or has a stated advantage here.

## Tradeoffs
None material identified — this is a low-controversy choice relative to the others in the stack.

## Consequences
Schema areas sketched in [08-data-architecture](../08-data-architecture.md) become the Level 1 migration target.

## Reconsideration conditions
None anticipated.
