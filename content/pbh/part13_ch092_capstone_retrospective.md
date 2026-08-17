## 92. Capstone Retrospective

### 92.1 The Full ADR Log, Assembled

Thirteen stages produced thirteen numbered ADRs (§79.3-91.3), each answering the same five questions (§78.3). Read consecutively, they form a single, continuous decision log for one evolving system:

| # | Decision | Chosen | Revisit Trigger (Actually Hit?) |
|---|---|---|---|
| 1 | Persistence for Stage 1 | In-memory dict | Yes — hit exactly at §82 |
| 2 | Identity representation | JWT | Not hit — no revocation requirement ever arose |
| 3 | Authorization granularity | Space-level only | Not hit — no narrower-sharing requirement arose |
| 4 | ORM vs. raw SQL | Full SQLAlchemy ORM | Not hit — eager loading remained sufficient |
| 5 | Cache invalidation strategy | Explicit invalidate-on-write | Not hit — space sizes stayed small |
| 6 | Background task mechanism | `BackgroundTasks` | Yes — hit exactly at §85 |
| 7 | Queue implementation | Celery over hand-rolled Redis | Not hit — Celery's defaults sufficed |
| 8 | Notification fan-out shape | Per-recipient tasks | Not hit — space sizes stayed small |
| 9 | Attachment storage location | Object storage | Not applicable — near-unconditional choice |
| 10 | Search implementation | PostgreSQL full-text | Not hit — keyword search stayed sufficient |
| 11 | RAG retrieval strategy | Reuse existing search | Not hit — keyword retrieval stayed sufficient |
| 12 | Observability timing | Dedicated retrofit stage | N/A — the retrofit *was* the correction |
| 13 | Deployment topology | Independent per-tier scaling | Not applicable — near-unconditional choice |

### 92.2 What the "Hit" Column Actually Teaches

Two of thirteen ADRs were explicitly revisited exactly when their own five-question format predicted they would be (§79.3 at Stage 4, §84.3 at Stage 6) — not a coincidence, but the direct payoff of writing an honest, concrete "what would make us revisit this" clause at decision time rather than a vague placeholder. The other eleven were never revisited within this capstone's scope, and that is equally informative: a decision that correctly anticipates its own limits and is never actually pushed past them is not a decision that "should have been more ambitious upfront" — building Stage 4's real database from day one, guessing that Stage 6's Celery migration would eventually be needed, would have been premature optimization against requirements that, at the time, didn't exist yet (companion §108.10's proportionality principle, demonstrated here across an entire system's real trajectory rather than argued abstractly).

### 92.3 The One Genuine Redesign: §81's `owner`-to-`space_id` Migration

Every other stage was pure addition — new routes, new fields, new dependencies — except one: §81.5's replacement of Stage 2's `owner` field with `space_id`. This is worth isolating explicitly, because companion §78.6 warned that a *faithful* incremental capstone would occasionally require this, and a capstone that never needed a single genuine revision would have been suspiciously, unrealistically clean. The lesson is not "avoid ever needing this" — it's recognizing that a layered architecture (companion §43) with authorization logic isolated behind a single function (`require_space_member`, unchanged in signature across §81-89 even as its internal implementation changed at §83 and §88) contains the blast radius of even a genuine data-model revision to a small, identifiable surface.

### 92.4 Where the Capstone's Own Non-Functional Requirements Actually Held

Revisiting §78.5's four fixed non-functional requirements against the finished system: **Correctness** held throughout, with the one near-miss being §86.7's duplicate-notification hazard, caught and fixed within the same stage it was introduced. **Latency** was actively threatened once (§84.6-84.7's in-process background-task competition) and resolved by the exact mechanism (§85's Celery migration) the responsible ADR had already named in advance. **Data isolation** was the requirement most stages actively worked to preserve as new features were layered on (§88.2 and, at higher stakes, §89.2, both explicitly re-deriving the same boundary rather than assuming it still held). **Evolvability** is best measured by §92.1's own table: eleven of thirteen additions required no revision to prior stages' code at all, a direct, measurable sign that the layering choices made early on actually paid off under real, sequential requirement growth rather than only appearing sound in isolation.

### 92.5 Interview Thinking

"Walk me through how you'd evolve a simple CRUD app into a production system" is, in effect, asking for a compressed version of this entire Part — a strong answer doesn't jump straight to a fully-scaled final architecture, but narrates the same kind of staged reasoning §79-91 modeled: what's added first, what's deliberately deferred and why, and what concrete signal would trigger each next addition, echoing the five-question ADR format (companion §78.3) as the actual structure of the answer, not just its content.

### 92.6 Mini Lab

Using your own extended copy of Fieldnote from the preceding stages' Mini Labs, write ADR-14 for one genuinely new requirement of your own choosing — something not covered by any of this Part's thirteen stages — following the exact five-question format from §78.3, then implement it. Add a row to §92.1's table for your own decision, and be honest in the "revisit trigger" column: state a real, checkable condition, not a placeholder — the single habit this entire capstone has been built to instill.

---
