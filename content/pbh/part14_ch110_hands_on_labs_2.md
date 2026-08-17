## 110. Hands-On Labs II

### 110.1 Lab 6: Migrate Fieldnote's Indexing From Placeholder to Real, Then Retire It Correctly

Reproduce §84-88's own capstone arc yourself, in order: implement §84's placeholder Redis-token indexing exactly as written, verify it works, then implement §88's real PostgreSQL full-text search `tsvector` column, then — as §88.5 explicitly instructs but doesn't show the mechanics of — actually delete the now-dead `index_note_task` code and its Celery task registration, and confirm the existing test suite still passes with it removed. This lab's real point is the deletion step: most engineers have far more practice adding code than deliberately, confidently removing code that's become obsolete, and this lab forces that underused skill.

### 110.2 Lab 7: Build a Minimal Outbox Pattern

Companion §46.7 introduced the Outbox pattern for solving the dual-write problem (a database write and an external event publish that must both happen or neither should). Implement a minimal version: a `create_order` operation that must both persist an order and publish an "order created" event, using an outbox table written in the same transaction as the order itself, with a separate poller process reading unpublished outbox rows and publishing them. Deliberately test the failure case this pattern is designed for: kill the poller process mid-publish and confirm that restarting it correctly resumes publishing the same event exactly once (or, acceptably, at-least-once with an idempotent consumer, companion §32.6) rather than losing it.

### 110.3 Lab 8: Reproduce a Connection Pool Exhaustion Incident, Then Fix It

Deliberately misconfigure a small test application's connection pool to be too small for a load test you construct (companion §72), and confirm you can reproduce the exact pool-timeout failure companion §72.1 describes. Then, without simply increasing the pool size as your only fix, also introduce a deliberate connection leak (a code path that acquires a session without the `yield`-based guaranteed-cleanup pattern, companion §72.5) and confirm you can distinguish — using only the metrics companion §72.3 names, not by reading your own source code — which of the two causes (undersizing versus leak) is responsible in each case. This lab exists specifically to build genuine diagnostic confidence: it's one thing to read that utilization-over-time shape distinguishes these two causes (§72.11's decision tree), and another to have actually watched both shapes occur and correctly told them apart from metrics alone.

### 110.4 Lab 9: Write Your Own Failure-Engineering Chapter

Choose a production symptom not covered by companion Part XII's eight named chapters (§70-77) — something specific to a technology or pattern this handbook didn't focus on (a message-broker-specific issue, a specific ORM edge case, a container-orchestration-specific failure) — and write your own chapter for it, following the exact structure every Part XII chapter used: Symptoms, Possible Causes, Metrics, Logs, Investigation, Root Cause, Fix, Tradeoffs, Prevention, Engineering Intuition, and a Decision Tree. This lab is deliberately the most open-ended in this Part: writing a genuinely useful diagnostic chapter, rather than only reading one, requires actually having internalized the diagnostic *shape* this handbook has modeled sixteen times over (eight failure-engineering chapters plus the debugging sections woven through every mechanism chapter), not merely the specific content of any one of them.

### 110.5 Lab 10: Full-Circle — Take Fieldnote Through an Interview

Using companion §93.2's five-phase framework, present your own extended version of Fieldnote (with whatever labs from §109 and this chapter you've completed layered in) as if walking an interviewer through a system-design answer, out loud, timed against the phase durations §93.2 specifies. Record yourself if possible. Afterward, review your own recording against companion §97's seven interview traps and companion §96's translation framework — checking specifically whether you narrated assumptions aloud (§97.6), stated tradeoffs honestly for paths not taken (§96.4), and named your own design's weaknesses unprompted in the wrap-up phase (§93.2's Phase 5) — the single exercise that most directly closes the loop between everything this handbook has taught and how that knowledge is actually assessed in the room where it counts.

### 110.6 Closing Note

These ten labs, together with every Mini Lab in Parts I-XIII, are the actual point of this handbook — reading about a mechanism produces recognition; building, breaking, and diagnosing it produces the judgment this entire handbook has been organized, from its very first chapter's Problem-before-Mechanism pipeline, to actually build. There is no final chapter after this one summarizing what's been learned — the four appendices that follow are reference material, not new teaching — because the accumulated thirteen Parts and ten labs are themselves the summary, and re-reading a summary is a weaker use of time than starting Lab 1.

---
