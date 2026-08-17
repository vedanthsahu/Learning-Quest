## §53. SLIs, SLOs, Runbooks, and Blameless Postmortems

### 1. The Vocabulary

- **SLI (Service Level Indicator)** — the actual measured value (e.g. "99.95% of requests
  succeeded last month").
- **SLO (Service Level Objective)** — the internal target for that indicator ("we aim for
  99.9%").
- **SLA (Service Level Agreement)** — an externally-facing, often contractual promise, usually
  looser than the internal SLO to leave margin for error.
- **Error budget** — the allowed amount of "not meeting the SLO" before it's treated as a real
  problem — e.g. an SLO of 99.9% uptime allows about 43 minutes of downtime a month as budget.
- **Runbook** — a written, specific set of steps for responding to a known type of incident.
- **Blameless postmortem** — a write-up of what happened during an incident, focused on
  systemic/process causes rather than individual blame, specifically because blame makes people
  hide mistakes instead of surfacing them.

### 2. Where It Sits, and Why Teams Use It

These are the practices that turn "we had an incident" into an organization that actually gets
more reliable over time, rather than repeating the same category of incident indefinitely.

### 3. What Actually Breaks

- **Confusing SLI, SLO, and SLA** — these are three distinct things (measurement, internal target,
  external promise), and using them interchangeably in a conversation is an easy, common tell of
  not actually having internalized the distinction.
- **No error budget discipline** — without treating the error budget as a real, spendable
  resource, teams either ship too cautiously (never using any allowed risk) or too recklessly
  (blowing through the budget every month with no consequence attached).
- **No runbook for a recurring incident type** — the same category of incident gets debugged from
  scratch every time instead of following a known, tested set of steps, wasting time exactly when
  time matters most.
- **A postmortem that assigns blame** — makes people defensive and incentivizes hiding mistakes or
  near-misses instead of surfacing them, which is the opposite of what actually improves
  reliability over time.
- **A postmortem with no concrete action items** — a well-written narrative that ends without
  specific, owned, tracked follow-up work just becomes a story, not a systemic fix.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "SLI is the actual measurement, SLO is our internal target, SLA is what we've promised
  externally — usually looser than the SLO on purpose."
- "An error budget is a resource to be spent deliberately, not just a number that gets reported
  after the fact."
- "A good postmortem is blameless and specifically about systemic causes, and it ends with
  concrete, owned action items, not just a narrative."

### 5. Interview-Ready Answer

> "I keep SLI, SLO, and SLA distinct: SLI is what's actually measured, SLO is the internal target
> we hold ourselves to, and SLA is the (usually looser) external promise. The error budget that
> falls out of the SLO is something I think of as a resource — it exists to be spent on reasonable
> risk, not just tracked as a compliance number. For incidents specifically, I want a runbook for
> anything that's happened before, and a blameless postmortem afterward focused on systemic
> causes and concrete action items, not on who made the mistake."

### 6. Go Deeper

companion Software Systems Handbook's §19 (Mental Model: Reliability Engineering) chapter and
companion Software Systems Handbook's §52 (Reliability Engineering Deep Dive) chapter (SLIs/SLOs/
error budgets, chaos engineering in full).

---
