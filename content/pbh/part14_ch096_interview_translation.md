## 96. Interview Translation: What the Interviewer Is Actually Testing

### 96.1 Why Translation Matters

Interview questions are rarely asked in the vocabulary of what they're actually testing — "design a rate limiter" sounds like a request for a specific artifact, but the interviewer is almost always using it as a vehicle for testing something more general (distributed coordination, race-condition awareness, tradeoff reasoning under ambiguity). Learning to translate a surface-level question into what's actually being assessed lets a candidate allocate their limited interview time toward what will actually be scored, rather than toward polishing an aspect of the answer the interviewer never intended to weigh heavily.

### 96.2 Common Surface Questions and Their Actual Target

"How would you make this API faster?" is rarely testing whether you know every possible optimization — it's testing whether you can *diagnose before prescribing* (companion §70's entire "FastAPI is slow" framework exists for exactly this instinct), since a candidate who immediately proposes caching without first asking what's actually slow is demonstrating pattern-matching, not diagnosis. "How would you handle a sudden 10x traffic spike?" is rarely testing raw infrastructure knowledge — it's testing whether you distinguish between things that scale linearly with simple replication (stateless web servers) and things that don't (a single database, a stateful WebSocket connection pool, companion §95.4's exact distinction), and whether you can name the *specific* component that would break first rather than answering "add more servers" uniformly. "Walk me through what happens when a user hits this endpoint" is rarely testing whether you can narrate the happy path — it's testing whether you spontaneously mention failure modes (a timeout, companion §32.4; an authorization check, companion §59; a partial failure in a downstream call) without being separately prompted for each one.

### 96.3 "Tell Me About a Time You Debugged a Production Issue"

This behavioral-sounding question is, in a backend interview, usually scored on the same axes as a live system-design question: did the candidate form a hypothesis before making a change (companion Part XII's entire Symptoms-to-Root-Cause discipline, narrated as a personal story rather than a framework); did they use metrics/logs to confirm the hypothesis rather than guessing and hoping; did they discuss what they changed afterward to prevent recurrence (companion §70.10's Prevention sections, again narrated personally). A candidate who tells a story ending at "and then it worked" without ever stating what confirmed the diagnosis is missing the part actually being scored.

### 96.4 "Why Would You Choose X Over Y?" Questions

These are testing whether you have a genuine decision criterion, not whether you land on the "correct" choice — because, as this handbook's own capstone retrospective (§92.2) makes explicit, most of these choices are legitimately context-dependent, and a fixed "always choose X" answer without a stated condition is a weaker answer than "Y, unless [specific condition], in which case X" even when the specific condition named is debatable. This is precisely the five-question ADR format (companion §78.3) compressed into a single spoken sentence — practicing that format (§93.6's Mini Lab) is the most direct preparation for this exact question shape.

### 96.5 When the Interviewer Pushes Back on Your Design

A pushback ("what if the database goes down right there?") is not (usually) a signal that your design is wrong — it's testing whether you can extend your own reasoning live, under a new constraint, without becoming defensive or abandoning your design's actual strengths. The strongest response names the specific failure mode the pushback introduces, states its actual likelihood/impact honestly, and proposes a bounded mitigation (a retry, a fallback, a circuit breaker, companion §67) rather than either dismissing the concern or redesigning the entire system from scratch in response to one edge case.

### 96.6 Mini Lab

Take one system-design question from §94-95 and write down, before re-answering it, what you believe the interviewer's top three actual scoring criteria are (using §96.2's translation instinct) — then re-answer the question allocating your time explicitly against those three criteria rather than against the surface-level request, and compare how differently you spend your time versus your first pass.

---
