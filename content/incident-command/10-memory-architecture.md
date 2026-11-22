# 10 — Memory Architecture

## Status
Proposed. Reframed entirely around the incident domain — this is not generic user/chat memory.

## Principle (unchanged)
Do not dump raw data into a vector store and call it memory. Memory is categorized, has provenance, and has a lifecycle.

## Categories, now incident-domain-specific

| Category | Contains | Storage |
|---|---|---|
| Working memory | The active investigation's gathered evidence for the current incident | In-request context, backed by `investigation_evidence` |
| Long-term operational memory | Prior incidents, their root causes, their resolutions, service relationships, general operational knowledge learned over time | `memory_records` (PostgreSQL + pgvector embedding — see [ADR-006](adr/ADR-006-milvus.md)) |
| Semantic retrieval | Embeddings for "have we seen this before" similarity search | pgvector column on `memory_records` |
| Durable incident history | The full incident record itself (timeline, evidence, resolution) | PostgreSQL (`incidents`, `incident_events`), S3 for exported reports |

Not included as a category here (and explicitly out of scope): generic per-user chat preference/personalization memory from the original chatbot framing — this product has no chat-personalization need.

## `memory_records` (planning shape)
`id, type (prior_incident | root_cause | operational_knowledge), content, embedding, source_incident_id, confidence, importance, status, created_at, updated_at`.

## Lifecycle (unchanged shape, Good to Have for full automation per [04-must-have-vs-good-to-have](04-must-have-vs-good-to-have.md))

```
NEW -> ACTIVE -> UPDATED -> STALE -> ARCHIVED
```

A resolved incident's root cause and resolution become a NEW memory record, promoted to ACTIVE once resolution is verified (see [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md)). If a later incident reveals the earlier diagnosis was actually wrong (e.g., a recurrence shows the "fix" didn't address the real cause), the earlier record should move toward STALE with a link to the corrected one — same provenance-preserving pattern as generic memory conflict resolution, applied to operational knowledge instead of user preferences.

## What must be addressed (carried over from the original memory doc, re-answered for this domain)

| Concern | Answer |
|---|---|
| What gets stored | Root causes, resolutions, and general operational knowledge extracted from resolved incidents |
| When created | At incident resolution (`RESOLVED` transition), not mid-investigation — avoids storing unverified/wrong conclusions as if they were confirmed knowledge |
| Where stored | PostgreSQL + pgvector (see [ADR-006](adr/ADR-006-milvus.md) for why Milvus is no longer the default) |
| Retrieval | Similarity search over prior incidents, filtered to ACTIVE records, scoped to relevant service/category |
| Relevance/confidence | `confidence`/`importance` fields; scoring mechanism open (Q9-equivalent, see [20-open-questions-and-risks](20-open-questions-and-risks.md)) |
| Staleness/conflicts | Lifecycle above; automatic conflict detection is Good to Have |
| Provenance | `source_incident_id` — always traceable to the incident that produced the knowledge |
| Deletion/privacy | Less acute than the original chatbot's user-memory case (this is operational knowledge, not personal data), but incident records may still reference employee actions — a deletion/redaction path for a departed employee's attributed actions is a reasonable future requirement, not MVP |

## Explicit non-goal
Graph memory / hybrid graph+vector retrieval remains Future/Advanced only — no change from the original stance.

## Related docs
[08-data-architecture](08-data-architecture.md) · [09-ai-engine-architecture](09-ai-engine-architecture.md) · [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md) · [ADR-006](adr/ADR-006-milvus.md) · [ADR-011](adr/ADR-011-memory-architecture.md)
