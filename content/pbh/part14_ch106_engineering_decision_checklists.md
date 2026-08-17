## 106. Engineering Decision Checklists

### 106.1 Purpose: Checklists as Compressed Judgment, Not a Substitute for It

A checklist doesn't replace engineering judgment — it exists to make sure judgment isn't skipped under deadline pressure or interrupted attention, the two conditions under which an experienced engineer is most likely to forget a step they genuinely know matters. Each checklist below compresses a specific recurring decision this handbook has taught in depth into a quick, pre-decision pass.

### 106.2 Checklist: Before Adding a New External Dependency Call

- Does this call have an explicit, bounded timeout (companion §32.4)? A missing timeout is companion §76.6's single most common root cause for hung workers.
- Is this call idempotent, or does it need to be made idempotent, before any retry logic is added (companion §32.6, §99.5)?
- Does a sustained failure of this dependency need a circuit breaker (companion §67.6), or is bounded retry-with-backoff alone sufficient given this dependency's actual criticality?
- Is this call on the synchronous or async path — if async, is it using a genuine async-native client, not a synchronous one silently blocking the event loop (companion §73.6)?

### 106.3 Checklist: Before Introducing a Cache

- What is the actual, expected read-to-write ratio for this data (companion §47.2) — is caching justified by this ratio, or assumed by default (companion §97.2's uniform-caching-reflex trap)?
- What staleness window is actually acceptable for this specific data — and does the chosen TTL reflect that window deliberately, not an arbitrary default?
- Is there an explicit invalidate-on-write path for every mutation of this data (companion §83.3's ADR-5), or is the design relying on TTL expiry alone for correctness it can't actually guarantee?
- Will cache hit rate be measured from day one (companion §74.9), not only investigated after a "this isn't helping" complaint?

### 106.4 Checklist: Before Writing a Schema Migration

- Does this migration lock the table for a duration proportional to table size, or is it a fast, metadata-only change (companion §28.6)?
- If adding a `NOT NULL` column, is the three-step zero-downtime pattern (add nullable, backfill, add constraint) being used rather than a single-step migration?
- Has this migration been tested against a realistically-sized dataset, not only an empty or small local database (companion §105.1's exact incident this step would have caught)?
- Is there a tested, not merely assumed, rollback path for this specific migration (companion §99.8)?

### 106.5 Checklist: Before Choosing Between Two Architectural Options

- Have both options' genuine tradeoffs been stated honestly, including for the option that will *not* be chosen (companion §78.3's ADR discipline)?
- Does the chosen option match the currently-stated scale and requirements, rather than a hypothetical future one (companion §108.10, applied here by forward reference to itself)?
- Is there a concrete, specific "what would make us revisit this" condition stated (companion §78.3's fifth question) — not a vague "if things change," but a measurable trigger?
- Has this decision been written down somewhere durable (an ADR, a design doc), or does it exist only as institutional memory that will be lost the moment the people involved move on?

### 106.6 Checklist: Before Marking a Service "Production Ready"

This checklist is deliberately not reproduced here in full — it already exists, complete, at companion §69.4, and duplicating it would risk the two copies drifting apart over time. Use §69.4 directly, and treat its own §69.5 warning (that a checklist confirmed once decays without ongoing maintenance) as the operative instruction for how often to re-run it.

### 106.7 Mini Lab

Pick one decision you're currently facing in a real project — adding a dependency, introducing a cache, planning a migration, or choosing between architectural options — and run it through the corresponding checklist above before making the decision, writing down your answer to every single item explicitly, even the ones that feel obvious; the items that feel most obvious are, in practice, the ones most often skipped entirely under real time pressure.

---
