# ADR-006 — Vector Retrieval: pgvector vs. Milvus

## Status
Proposed — **reversed** from the original charter's default (2026-09-02 revision, incident-command pivot).

## Context
Similar-prior-incident retrieval needs vector similarity search. See [10-memory-architecture](../10-memory-architecture.md), [22-production-simulator](../22-production-simulator.md).

## Problem
The original ADR-006 kept Milvus as the Must Have default purely on learning-goal grounds, explicitly accepting its operational overhead despite the functional need being satisfiable by pgvector. The incident-command pivot makes the realistic data volume concrete: a handful of scenario types, realistically dozens to low hundreds of resolved incidents over the project's lifetime (see [22-production-simulator](../22-production-simulator.md)). At that scale, a dedicated ANN vector database provides no measurable retrieval-quality or performance advantage over pgvector.

## Options considered
- **Milvus** — the original default; still a valid learning objective, but its case is weaker now that the actual scale is known and small.
- **pgvector** — zero additional infrastructure, uses the PostgreSQL instance the project already runs and needs for the incident domain, sufficient for the realistic corpus size.

## Decision
**pgvector is now the Must Have default.** Milvus is demoted to Good to Have — worth adding later specifically as a learning exercise (stand it up, migrate the embedding column over, compare) once the core product is working, but not a blocker or a default dependency.

## Rationale
Unlike the original chatbot project (where a large, growing, multi-user memory corpus was at least plausible), the incident-command domain's corpus is bounded by how many scenarios and real incidents actually get authored/run — small by construction. Introducing Milvus ahead of that reality is the "architecture as decoration" pattern the source brief explicitly warns against for this revision (§33: "Also evaluate whether pgvector would provide a simpler solution").

## Tradeoffs
The Milvus-specific learning objective (standing up and operating a dedicated vector DB) is deferred, not lost — it can still be done later as an explicit, isolated exercise once the core product doesn't depend on it working.

## Consequences
[08-data-architecture](../08-data-architecture.md), [10-memory-architecture](../10-memory-architecture.md), [04-must-have-vs-good-to-have](../04-must-have-vs-good-to-have.md), and [05-technology-stack](../05-technology-stack.md) all reflect pgvector as the default.

## Reconsideration conditions
Revisit if the resolved-incident corpus genuinely grows large (unlikely within this project's scope), or when the Milvus learning objective is picked up as a standalone exercise post-MVP.
