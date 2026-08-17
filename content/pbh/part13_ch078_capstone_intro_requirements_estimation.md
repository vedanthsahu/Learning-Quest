## 78. Capstone Intro: Requirements & Estimation

### 78.1 The Purpose of This Part

Parts I-XII each taught a mechanism, a discipline, or a diagnostic framework in isolation — one topic, cleanly scoped, with its own Mini Lab. Real backend engineering rarely arrives in cleanly scoped units; it arrives as one evolving system that must absorb new requirements without a ground-up rewrite. This Part follows a single backend, **Fieldnote**, through thirteen stages of genuine evolution — from a bare CRUD skeleton through authentication, authorization, a real database, caching, background work, queues, notifications, file processing, search, AI integration, observability, and finally production deployment and scaling — using the same **Architecture Decision Record (ADR)** discipline as the companion Software Systems Engineering Handbook's own capstone, so that every non-trivial choice made along the way is captured, not just its final result.

### 78.2 What Fieldnote Is

Fieldnote is a collaborative notes and knowledge-base backend: users create notes, organize them into shared spaces, attach files, search across everything they have access to, and — by the AI Integration stage — ask natural-language questions answered from their own notes. This shape was chosen deliberately: it's simple enough to start as pure CRUD (§79) yet naturally demands every mechanism this handbook has taught, in a believable order, without inventing artificial reasons to use a technology.

### 78.3 The Five-Question ADR Format (Inherited From the Companion Handbook)

Every non-trivial decision in every stage of this capstone is recorded as an ADR answering exactly five questions, in this order: **(1) What are we deciding?** — stated as a specific, bounded question, not a vague topic. **(2) What options did we genuinely consider?** — at least two, including "do nothing" or "the simplest possible approach" where relevant. **(3) What are the real tradeoffs between them?** — cost, complexity, performance, and time-to-implement, stated honestly rather than favoring the eventual choice. **(4) What did we choose, and why?** — the decision, justified against the specific requirements *at this stage*, not against some imagined future requirement. **(5) What would make us revisit this decision?** — the specific, concrete signal (a metric threshold, a new requirement, a scale milestone) that would trigger reopening this ADR rather than treating it as permanent. This format is what makes the capstone's engineering *reasoning*, not just its final code, the actual teaching artifact — matching this handbook's Part 0 commitment that mechanism is taught only after the problem and tradeoffs that motivate it.

### 78.4 Functional Requirements (Stage 1 Baseline, Expanding Per Stage)

At the outset (§79), Fieldnote must support: creating, reading, updating, and deleting notes; organizing notes into named spaces; and listing a user's own notes. Each subsequent stage's chapter states its own newly-added functional requirements explicitly — this deliberate incrementalism mirrors how real systems actually grow, where "the full requirements" are never known upfront and a system's architecture must tolerate requirements arriving in this staged, incomplete way (companion Software Systems Handbook §8's evolvability principle).

### 78.5 Non-Functional Requirements Established From the Start

Even though functional scope grows incrementally, several non-functional requirements are fixed from Stage 1 onward and must not be silently violated by any later stage's addition: **Correctness** — a note is never lost or silently corrupted. **Reasonable latency** — typical operations complete within a few hundred milliseconds even as data volume grows. **Data isolation** — a user only ever sees notes and spaces they have legitimate access to, from the moment authorization exists (§81) onward. **Evolvability** — each stage's addition should require extending, not rewriting, the previous stage's code, directly testing whether the architectural choices from earlier stages (companion §43's layered architecture) actually hold up under real, sequential requirement growth rather than being validated only in a single, static snapshot.

### 78.6 Engineering Constraint: A Capstone Skipped Ahead Teaches the Wrong Lesson

It would be possible to design Fieldnote's final, thirteen-stage architecture in a single pass and simply present it as a finished system — but doing so would teach exactly the wrong lesson, since real backends are never designed complete on day one; they accumulate. Building genuinely incrementally, stage by stage, with each stage's ADRs reflecting only the information available *at that stage* (not smuggling in knowledge of what Stage 11's AI Integration will eventually need), is what makes this capstone a faithful model of real engineering rather than a polished retrospective narrative dressed up as a process.

### 78.7 Estimation: How Much Each Stage Actually Costs

Before beginning Stage 1, it's worth being explicit about what "estimation" means for a capstone whose purpose is teaching, not shipping on a deadline: each stage chapter states, upfront, its own rough scope (new endpoints, new data model changes, new external dependencies) so that the reader can gauge, before reading the implementation, roughly how large a real-world change of this kind would be — directly practicing the estimation instinct companion §106's engineering decision checklists later formalize, applied here in miniature at each individual stage rather than only for the capstone as a whole.

### 78.8 How to Use This Part

Each stage chapter (§79-91) follows the same shape: **Stage Goal** (what's being added and why now, not earlier or later), **New Requirements** (the specific functional/non-functional additions), **ADR(s)** (the five-question format from §78.3 for every non-trivial choice this stage makes), **Implementation** (the concrete code delta — never a full restated application, only what's new or changed), **What Changed in the Architecture** (explicitly naming which earlier-stage assumption, if any, had to bend), and a **Mini Lab** extending the reader's own running copy of Fieldnote. Read sequentially — later stages assume every earlier stage's code and decisions are in place, exactly as they would be in a genuinely evolving production system.

### 78.9 Mini Lab

Before Stage 1, sketch your own five-question ADR (§78.3) for a decision every real backend project actually faces on day one but that this chapter has not yet addressed: which web framework and which database to start with. Answer honestly, including a genuine "what would make us revisit this" trigger — then compare your answer against the actual choices (FastAPI, PostgreSQL) this capstone makes starting in §79, not to check whether you "got it right," but to practice the habit of writing the reasoning down before writing any code, which is this entire Part's central discipline.

---
