## 57. Incident Response Deep Dive: Detection, Triage, Runbooks, Postmortem Structure, ADRs

### 57.1 What This Chapter Adds to §24

§24 established the incident lifecycle and blameless postmortem culture at the mental-model level. This chapter covers the concrete mechanics: how detection and triage actually operate, what a runbook contains and why, a real postmortem document's structure, and how Architecture Decision Records connect incident learnings back into future design decisions.

### 57.2 Detection Mechanics: Alerting on Symptoms, Not Causes

Effective detection (§24.3) is built on alerting rules tied to the SLIs from §52.2 — symptoms a user would actually notice (elevated error rate, degraded latency) — rather than internal causes (a specific server's CPU usage, a specific queue's depth), because a cause-based alert can fire without any actual user impact (a CPU spike that doesn't affect latency) or fail to fire despite real user impact (a problem whose root cause wasn't anticipated by any specific internal metric). This is sometimes summarized as "alert on symptoms, page on symptoms, but use causes for diagnosis" — the alert that wakes someone up should answer "is a user actually affected," while cause-level metrics (§48.2) are consulted afterward, during diagnosis, to answer "why." Getting this wrong in the opposite direction — alerting on every internal anomaly regardless of user impact — produces **alert fatigue**: a high volume of alerts that don't reliably correspond to real problems, which reliably teaches on-call engineers to under-react to alerts in general, directly undermining the entire detection system's purpose.

### 57.3 Triage: Severity Levels and Escalation

Given a detected incident, **triage** assigns a severity level (commonly a simple numbered scale, e.g., Sev1 for a full outage of a critical function down to Sev4 for a minor, contained issue) that determines the response's urgency and scope — who is paged, whether customers are proactively notified, whether senior leadership is looped in. A well-designed triage process has clear, pre-defined, mostly-objective criteria for each severity level (e.g., "Sev1: complete unavailability of the core user-facing service, or any data-loss-causing event"), specifically to avoid the costly ambiguity of debating severity classification in the middle of an active incident, when that time and attention should be spent on mitigation instead — directly echoing §52.3's argument for deciding policy in advance, calmly, rather than negotiating it under pressure.

### 57.4 Runbooks: Encoding Response Knowledge Before It's Needed

A **runbook** is a pre-written, step-by-step procedure for responding to a specific, anticipated type of incident (e.g., "database replica lag exceeds threshold," "certificate expiring within 24 hours") — written calmly, in advance, by someone with deep knowledge of the system, so that whoever is actually on-call during a real incident (who may have far less context, may be less experienced, or may simply be under the cognitive strain of a 3 a.m. page) can follow a clear, tested procedure rather than needing to improvise a diagnosis and fix from scratch under pressure. A good runbook is specific and actionable (exact commands or dashboard links, not vague guidance like "check if the database is healthy"), is kept up to date as the underlying system changes (a stale runbook referencing a decommissioned system component is often worse than no runbook, since it actively misleads), and explicitly states its own scope — what it covers, and, importantly, when to abandon the runbook and escalate to a human with deeper expertise rather than continuing to follow a procedure that isn't resolving the issue.

### 57.5 Postmortem Document Structure

A well-structured postmortem, following directly from §24.2's blameless principle and §24.4's "concrete action items" requirement, typically includes: a brief **summary** (what happened, user impact, duration); a precise **timeline** (when the issue began, when it was detected, key actions taken, when it was resolved — each timestamped, reconstructed from logs/monitoring rather than memory alone); a **root cause analysis** that goes beyond the immediate trigger to the systemic factors that allowed it (per §1.3.5's "the human action is a trigger, not a root cause" framing); and a specific, owned, time-bound list of **action items**, each clearly distinguishing preventive fixes (stopping this exact issue from recurring) from detective improvements (catching it faster next time if a similar-but-different issue occurs) — since not every incident's full class of possible recurrence can be entirely eliminated, and improving detection/mitigation speed for the residual risk is itself a legitimate, valuable outcome, not a consolation prize for failing to achieve full prevention.

### 57.6 The "Five Whys" and Avoiding Superficial Root Causes

A simple, widely-used technique for root cause analysis (§57.5) is the **Five Whys** — repeatedly asking "why did that happen" starting from the immediate trigger, until reaching a genuinely systemic, actionable cause rather than stopping at the first superficial answer.

```
Immediate trigger: "The deploy caused an outage."
Why? -> "The new code had a bug that crashed under load."
Why? -> "The bug wasn't caught by testing."
Why? -> "There's no load test covering this code path."
Why? -> "Load testing isn't a required step in our deploy
         pipeline for this class of change."
Why? -> "We've never had a formal policy defining which
         changes require load testing before deploy."

Stopping at the FIRST "why" ("the code had a bug") leads to
a postmortem action item of "fix the bug" -- true, but
narrow, and does nothing to prevent the NEXT bug of a similar
kind. Continuing to the systemic cause leads to an action
item that actually reduces future risk: establish a policy
for when load testing is required before deploy.
```

This technique directly operationalizes §24.4's warning against "be more careful"-style conclusions: each successive "why" pushes the analysis further from an individual action and closer to a systemic, fixable gap in the system or process itself.

### 57.7 Architecture Decision Records: Closing the Loop Back Into Design

An **Architecture Decision Record (ADR)** is a short, durable document capturing a specific architectural decision, the context and constraints that led to it, the alternatives considered, and the reasoning for the choice made — written at the time the decision is made, not reconstructed later from memory. ADRs connect directly back to incident postmortems (§57.5): a postmortem's action items frequently include or motivate a genuine architectural change, and recording that change as an ADR (rather than only as a merged code change with no preserved rationale) means future engineers — who won't have been present for the original incident — can understand *why* the system is built the way it is, preventing a common, costly failure mode where a well-reasoned safeguard, introduced in direct response to a past incident, is later removed or "simplified away" by someone unaware of the specific problem it was quietly preventing.

### 57.8 Common Mistakes and Production Debugging Signals

- Alerting on internal, cause-level metrics rather than user-facing symptoms (§57.2), producing either alert fatigue (too many low-value alerts) or missed real incidents (a genuine user-facing problem with no corresponding cause-level alert configured for its specific, unanticipated root cause).
- Maintaining runbooks that were accurate when written but have since drifted out of sync with the actual system, actively misleading on-call responders during a real incident rather than helping them (§57.4).
- Postmortems that stop at the first, superficial "why" (§57.6), producing action items that fix the specific instance of a problem without addressing the systemic gap that will very likely produce a similar, different-but-related incident again later.

### 57.9 Engineering Intuition

> **How do I know if my alerting is well-calibrated?** Track the ratio of alerts that correspond to genuine, actionable user impact versus alerts that turn out to require no action — a high false-alarm ratio is the direct signature of alert fatigue risk (§57.2).
>
> **What symptoms indicate stale runbooks?** An on-call engineer following a runbook's steps exactly, only to find a referenced dashboard, command, or system component no longer exists or behaves as described.
>
> **What metrics indicate a postmortem process gap?** Recurrence rate of similar (not necessarily identical) incidents over time — a healthy, effective postmortem practice should show this declining, not staying flat or increasing.
>
> **What breaks first if ADRs aren't maintained?** A safeguard introduced specifically in response to a past incident is later removed by someone with no visibility into why it existed, and the same class of incident recurs, effectively "forgetting" a lesson the organization had already paid to learn once.
>
> **When is a lightweight incident process (no formal severity levels, no ADRs) appropriate?** A very small team with infrequent incidents and a small, easily-remembered architectural history can reasonably operate with less formal process — the value of runbooks, formal triage criteria, and ADRs grows specifically with team size, system complexity, and incident frequency, where informal memory and communication no longer scale.
>
> **What would a hyperscale company do?** Maintain a large, continuously-updated runbook library, enforce symptom-based alerting and formal severity-based triage as standard practice, apply the Five Whys or an equivalent rigorous root-cause technique to every significant incident, and maintain a searchable ADR repository referenced during design reviews for new work (§79).
>
> **What would a two-person startup do?** Keep a small number of runbooks for their most failure-prone or highest-impact components, use a simple, informal severity distinction (urgent versus not), and write brief, honest postmortems focused on the most impactful action items rather than exhaustive formal structure.
>
> **What changes with scale?** At small scale, informal incident handling with good judgment substitutes reasonably well for formal process. At larger scale, with more engineers, more incidents, and more institutional history to preserve, the formal mechanisms in this chapter — calibrated alerting, current runbooks, rigorous postmortems, and maintained ADRs — become necessary to prevent the same lessons from needing to be relearned repeatedly (§79).

### 57.10 Exercises

1. A recurring incident type has a runbook, but on-call engineers report it's frequently unhelpful or outdated. Using §57.4, propose a specific process for keeping runbooks current, and identify who should be responsible for it.
2. Apply the Five Whys (§57.6) to a real or hypothetical incident of your choosing, and compare the actionability of the first "why" you'd naturally stop at versus the systemic cause you reach after continuing the analysis further.

### 57.11 Further Reading

- Google, *Site Reliability Engineering*, Chapters 12-15 (Effective Troubleshooting, Emergency Response, Managing Incidents, Postmortem Culture) — the authoritative, comprehensive treatment underlying this entire chapter.
- Michael Nygard, "Documenting Architecture Decisions" (2011) — the original blog post proposing the ADR format described in §57.7.

---
