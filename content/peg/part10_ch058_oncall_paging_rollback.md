## §58. On-Call, Paging, and Rollback vs Roll-Forward

### 1. The Vocabulary

- **On-call rotation** — a schedule of who's responsible for responding to production issues
  during a given period, often outside normal working hours.
- **Paging / escalation policy** — the mechanism (PagerDuty, Opsgenie) that alerts the on-call
  engineer, and the defined chain of who gets notified next if the first person doesn't respond.
- **Rollback** — reverting to the previous known-good deployed version.
- **Roll-forward** — instead of reverting, deploying a new fix on top of the broken version.

### 2. Where It Sits, and Why Teams Use It

Every team running production services needs an answer to "who gets woken up, and what do they
actually do" — and specifically, a fast, low-stress default decision for "do we roll back or push
a fix forward" the moment something's actively broken.

### 3. What Actually Breaks

- **No clear escalation policy** — a page that goes unanswered with no defined next step means an
  incident sits unaddressed longer than it should, purely from a process gap, not a technical one.
- **Defaulting to roll-forward under pressure, when rollback was faster and safer** — a rushed fix
  written mid-incident, under pressure, with less review than usual, is a real, common way one
  incident turns into two; rollback is very often the faster, safer first move, with the real fix
  investigated calmly afterward.
- **A rollback that isn't actually fast or well-rehearsed** — if reverting to the previous version
  takes as long as writing and deploying a fix would, the "rollback is the safe default" advice
  doesn't hold in practice — this is why a fast, tested rollback path (§14) is worth investing in
  before it's needed.
- **Being on-call with no runbook and no context** — being paged for a system you don't understand
  well, with no runbook (§53) to lean on, turns every incident into a from-scratch investigation
  under time pressure.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "My default instinct when something just broke after a deploy is rollback first, investigate
  the real fix calmly after — not write a fix under pressure."
- "A rollback path is only actually useful if it's fast and tested ahead of time, not just
  theoretically possible."
- "I'd want a runbook and enough context before going on-call for a system, not learn it for the
  first time during an actual incident."

### 5. Interview-Ready Answer

> "If something broke right after a deploy, my default is rollback first, investigate the real
> root cause and write a proper fix after, rather than trying to roll forward with a rushed fix
> under pressure — that's a common way one incident becomes two. That only works, though, if
> rollback is actually fast and rehearsed ahead of time, which is why I think of a tested rollback
> path as part of the deployment process itself, not something to figure out for the first time
> during an actual incident."

### 6. Go Deeper

companion Software Systems Handbook's §52 (Reliability Engineering Deep Dive) chapter (runbooks,
incident response); this book's own §14 (Deployment Strategies) and §53 (Runbooks & Postmortems).

---
