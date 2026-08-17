## Appendix D: Decision Tree Index

### D.1 Purpose

Part XII's eight failure-engineering chapters (§70-77) each closed with an explicit decision tree for triaging that chapter's named symptom. This appendix collects pointers to all of them in one place, since a genuine production incident rarely announces which chapter it belongs to in advance.

### D.2 The Eight Part XII Decision Trees

**"FastAPI Is Slow"** (§70.12) — starts by asking whether slowness is uniform or endpoint-specific, then whether the dominant cost is CPU-bound or waiting. **"Async Is Slower Than Sync"** (§71.11) — starts by classifying the workload as CPU-bound or I/O-bound. **"Database Connections Are Exhausted"** (§72.11) — starts by asking whether pool utilization tracks traffic level (undersizing) or trends upward regardless of traffic (a leak). **"SQLAlchemy Is Blocking the Event Loop"** (§73.11) — starts by checking the actual configured database driver. **"Redis Isn't Helping"** (§74.11) — starts by measuring actual cache hit rate. **"Memory Is Leaking"** (§75.11) — starts by confirming RSS growth over a hours-to-days timescale, then comparing `tracemalloc` snapshots for growth (not absolute count). **"Workers Are Hanging"** (§76.11) — starts by asking whether one worker or all workers are affected, then checking CPU usage. **Upload/CPU/Consistency Triage** (§77) — three shorter, situational checks rather than one unified tree: upload timeouts (§77.2), high CPU requiring profiling before action (§77.3), and response inconsistency requiring a latency-vs-results split (§77.4).

### D.3 Using This Appendix During an Actual Incident

Start with §D.4's meta-triage question below to route to the correct chapter's tree quickly, rather than reading all eight trees during a live incident.

### D.4 Meta-Triage: Which Tree Applies?

Is the symptom about **latency** (something is slow) or **availability** (something has stopped entirely)? If latency and endpoint-specific: §70. If latency and specifically about async code: §71. If availability and about database access specifically: §72 or §73 (§72 for a pool timeout; §73 if the app looks async but queries are still oddly slow/blocking). If availability or ineffectiveness specifically involving Redis: §74. If the symptom is a slow, gradual resource climb over hours/days: §75. If a specific process or worker has stopped making progress entirely while others are fine: §76. If the symptom is upload-specific, CPU-specific, or "requests are inconsistent": §77.

### D.5 Non-Part-XII Decision-Relevant Frameworks Elsewhere in This Handbook

Beyond Part XII's eight explicit trees, several other chapters embed a comparable, if less formally diagrammed, decision structure worth knowing about: the ORM-vs-raw-SQL and cache-vs-no-cache ADRs throughout the capstone (§79-91, tabulated in full at §92.1); the ADR-format decision structure itself (§78.3), applicable to any architectural choice not already covered by a named chapter; and §D.2's own companion, the interview-context translation table at §96.2, for routing a *question* (rather than an *incident*) to the framework it's actually testing.

### D.6 Mini Lab

The next time you face a genuine, real production symptom — not a hypothetical one — run it through §D.4's meta-triage question before consulting any other resource, and note whether it routed you to the correct Part XII chapter on the first attempt; a miss here is worth investigating on its own, since it may reveal either a gap in this appendix's routing logic or a genuinely novel failure shape worth writing up as your own Part XII-style chapter (companion §110.4's exact exercise).

---
