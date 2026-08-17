## Appendix C: Exercise Answer Key and Discussion Notes

*This handbook contains roughly 180 exercises across 90 chapters. Rather than providing a single "correct" answer for each — which would misrepresent the nature of most of these exercises, many of which ask you to apply a framework to your own system and have no universal answer — this appendix provides discussion notes: the general reasoning pattern each part's exercises are testing, plus worked guidance for a representative sample of exercises per part. Use these to check whether your own answer engaged with the right considerations, not to check for an exact match.*

### Part I Exercises: Mental Models

Part I's exercises (§1-24) almost universally ask you to do one of two things: (a) apply a chapter's problem/tradeoff framework to a system you personally know, or (b) reason forward from a stated scenario to a category of consequence, without needing implementation-level detail. The discussion pattern that applies across nearly all of them: identify the *specific* pressure (time, failure, or change, per §1.1) or resource (compute, storage, network, per §1.4) at play, name the tradeoff being made, and check whether your answer stayed at the conceptual level appropriate to Pass 1 rather than reaching for mechanisms not yet introduced.

Worked example (§8.7, Exercise 1): a single database machine with no replicas has just suffered a two-hour outage and lost recent writes. The correct reasoning path is: this is a failure-pressure problem (§1.1), specifically solved by replication (§8.2), not sharding (§8.4) — the system's data comfortably fits on one machine, so there is no capacity justification for sharding, only a durability/availability justification for replication. An answer that proposed sharding here would have misdiagnosed which of the two problems (§8.1) was actually present.

### Part II Exercises: Engineering Depth

Part II's exercises (§25-57) shift from "what's the right category of response" to "trace the actual mechanism." The discussion pattern: your answer should name a specific algorithm, data structure, or protocol step, not just a general concept. Where an exercise asks you to diagnose a scenario (e.g., §33.9's sequential-scan diagnosis, §63.8's hot-shard diagnosis), a complete answer identifies the specific mechanism (planner statistics, cache-key fragmentation, replication lag) rather than a generic "check the logs."

Worked example (§32.8, Exercise 1): a booking system allows two concurrent requests to both see "seat available" and both book it. The correct diagnosis is a non-repeatable-read-class anomaly (§32.3) permitted under Read Committed isolation, and the fix is either Serializable isolation or explicit row-level locking for this specific operation — not a vague "add more validation," which doesn't address the actual concurrency mechanism at fault.

### Part III Exercises: Large-Scale Engineering

Part III's exercises (§58-79) test whether you can distinguish "this mechanism is unchanged from Part II" from "this specific consequence only appears at hyperscale." A strong answer explicitly separates the two, per §79.6's stated meta-lesson. A common mistake to watch for in your own answers: proposing a hyperscale-specific fix (multi-region NewSQL, a dedicated SRE org) for a problem that a Part II-level mechanism already solves at the stated scale — re-read the specific numbers given in the exercise before reaching for the most sophisticated available tool.

Worked example (§73.7, Exercise 1): a request fanning out to 30 downstream calls, each with a small independent chance of exceeding a latency threshold. The correct reasoning is qualitative probability compounding (§73.2) — do not attempt an exact binomial calculation unless the exercise explicitly asks for one; the goal is recognizing *that* the aggregate probability is meaningfully higher than any single call's own, and *why* fan-out breadth is the driving variable.

### Part IV Exercises: The Capstone (Loop)

Part IV's exercises (§80-90) test whether you can apply the five-question framework (§80.5) yourself, to a stage or scenario not already worked through in the text. There is no single correct architecture for any of these — the discipline being tested is whether your proposed answer is *justified by a stated, specific constraint* rather than by "best practice" in the abstract, exactly per §1.5's central warning against premature sophistication.

Worked example (§90.6, Exercise 2): imagining Loop's growth compressed into a single week rather than gradual stages, and asking which of the nine ADRs could have been skipped or compressed. A strong answer recognizes that ADR-001 through roughly ADR-004 (basic monitoring, caching, statelessness) would likely need to be adopted nearly simultaneously rather than sequentially — because a compressed timeline means the *symptoms* that justified each decision (§82.2, §83.2, §84.2) would all appear in rapid succession rather than being individually diagnosed and fixed in turn — while later-stage decisions (ADR-008's dedicated SRE org, ADR-009's custom infrastructure) genuinely cannot be compressed, because they depend on *organizational* maturity (team size, operational experience) that cannot be manufactured merely by having more servers sooner.

### Part V Exercises: Terminology (implicit)

Part V's entries do not carry numbered exercises in the same format as earlier parts, but each entry's "Misconception" line functions as an implicit exercise: for any term, articulate why the stated misconception is wrong, using the mechanism from that term's original, fuller treatment elsewhere in the handbook. This is a useful self-test: if you cannot explain *why* a given misconception is wrong without re-reading the original chapter, that term's underlying mechanism has not yet been fully internalized.

### General Guidance for Self-Assessment

Across all four parts, a genuinely strong exercise answer has three properties, corresponding directly to this handbook's own stated philosophy (§0.1): it identifies the *specific* problem before proposing a solution; it considers at least one real alternative before committing to an answer (per the five-question format's explicit requirement, §80.5, item 3); and it states, explicitly, what new cost or risk its proposed fix introduces (per §80.5, item 5) rather than presenting any fix as a final, complete, consequence-free solution.

---
