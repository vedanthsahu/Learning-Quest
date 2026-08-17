## 24. Mental Model: Incidents and Postmortems

### 24.1 The Problem: Failures Will Happen, Regardless of How Well You've Built the System

Every chapter so far has introduced ways to reduce the likelihood or blast radius of failure — but §1.1 and §19.1 both established that eliminating failure entirely is neither achievable nor the right goal. Given that, a system needs a deliberate answer to a different question: when a failure happens anyway, how does the organization detect it, respond to it, limit its damage, and learn from it — reliably, and without that response itself becoming a source of further mistakes made under pressure? This is the discipline of incident management, and its retrospective half, the postmortem. Runbook structure, detection/triage mechanics, and detailed postmortem templates are deferred to Pass 2, §57.

### 24.2 Why "Blameless" Is a Deliberate Engineering Choice, Not Just a Nice Culture

§1.3.5 named "failures of human process" as a category, and made the point that the human action is usually a trigger, not a root cause — the system made the mistake easy or the correct action hard. **Blameless postmortems** operationalize this principle directly: when reviewing an incident, the explicit goal is to understand what about the *system* (its design, its tooling, its processes, its documentation) allowed a reasonable person to make the mistake they made, rather than to assign personal fault. This is not merely a kindness — it is a load-bearing engineering choice, because a culture that punishes the person who made a mistake or triggered an incident reliably teaches people to hide mistakes, delay reporting problems, and avoid the exact transparency that postmortems depend on to find real, systemic fixes. An organization that cannot get honest, detailed accounts of what happened cannot reliably improve the system that allowed it to happen.

### 24.3 The Incident Lifecycle: Detect, Triage, Mitigate, Resolve, Learn

A useful mental model breaks incident response into distinct phases, each with a different goal:

- **Detect**: something is wrong, and someone (ideally an automated alert, not a user complaint) has noticed. This depends directly on the observability discipline from §16 — you cannot detect what you cannot see.
- **Triage**: how severe is this, and who needs to be involved? Not every incident warrants the same urgency or the same escalation.
- **Mitigate**: stop the bleeding — restore acceptable service, even if the underlying cause isn't yet understood or fixed. This is a deliberately distinct goal from fixing the root cause; a rollback or a failover can mitigate an incident in minutes, while understanding and permanently fixing the cause might take days.
- **Resolve**: the underlying cause is actually addressed, not merely worked around.
- **Learn**: the postmortem — understanding, in depth, what happened and what should change, per §24.2's blameless framing.

Separating "mitigate" from "resolve" is one of the more consequential ideas in this list: under pressure, teams that conflate the two often delay restoring service while they search for a full root-cause fix, when a faster, blunter mitigation (rolling back a recent deploy, failing over to a healthy replica) would have limited user harm far sooner.

### 24.4 What a Good Postmortem Actually Produces

The tangible output of a good postmortem is not a document that exists to satisfy a process requirement — it is a specific, prioritized list of changes (to code, to alerting, to documentation, to process) that measurably reduce the chance of this class of incident recurring, or measurably reduce its impact and detection time if it does. A postmortem that concludes "the engineer should have been more careful" has, by the reasoning in §24.2, failed to do its job — "be more careful" is not a change to the system and will not survive contact with the next person under the same pressure, with the same misleading dashboard, or the same missing safeguard.

### 24.5 Incidents as the Feedback Loop for Everything Else in This Book

It's worth being explicit about how this chapter connects backward: an incident is frequently the moment a system's actual behavior under a real failure (§1.3), a real capacity limit (§23), or a real security gap (§17) becomes undeniable, in a way that design review or testing did not surface in advance. A mature engineering organization treats incidents not as an embarrassment to be minimized in conversation, but as the most reliable, highest-fidelity source of information about where the system's actual weaknesses are — which is exactly why the postmortem process, and the discipline of actually completing its resulting action items, matters as much as the incident response itself.

### 24.6 Engineering Intuition

> **How do I know an incident process is inadequate?** If the same class of incident recurs repeatedly with no systemic change between occurrences, or if postmortems consistently conclude with "the individual should have done X differently" rather than a system change, the process is not functioning as intended.
>
> **What symptoms indicate this?** Long time-to-detect relative to the time an issue was actually impacting users (an observability gap, §16); repeated incidents from the same root cause; a culture where people are reluctant to be the one who reports or owns up to a problem.
>
> **What metrics indicate it?** Mean time to detect, mean time to mitigate, and mean time to resolve, tracked per incident and over time; the fraction of postmortem action items actually completed within an agreed timeframe.
>
> **What breaks first if this discipline is neglected?** The same failures recur, because nothing systemic changed after the first occurrence — the organization pays the cost of the same incident repeatedly instead of paying once to fix it.
>
> **When is a lightweight process acceptable?** A very small team with infrequent, low-stakes incidents can reasonably use an informal process (a quick written summary and a short discussion) rather than a heavyweight, formal postmortem template — the goal (blameless learning and concrete follow-up) matters more than the format.
>
> **What would a hyperscale company do?** Run formal incident command structures for major incidents, dedicated postmortem review processes with tracked action items, and organizational structures (on-call rotations, sometimes follow-the-sun across time zones) built specifically around fast detection and response at their scale (§79).
>
> **What would a two-person startup do?** Keep a simple, honest record of what happened and what will change after each incident, without formal tooling, and prioritize actually making the identified changes over the format of the documentation.
>
> **What changes with scale?** At small scale, informal, quick postmortems are proportionate to the actual stakes and incident frequency. At large scale, with many teams, many services, and incidents affecting real revenue and reputation continuously, formal incident command, dedicated on-call organization, and rigorous postmortem follow-through become necessary, developed fully in §79 alongside real, named production outage case studies.

### 24.7 Exercises

1. Recall a real incident (from a system you've worked on, or one publicly documented) and identify whether its postmortem, if one existed, focused on system changes or on individual behavior. Rewrite one "be more careful"-style conclusion as a concrete system change instead.
2. Explain, using §24.3, why immediately rolling back a bad deploy is often the correct first action even before the root cause is understood, and what risk this approach accepts in exchange for speed.

### 24.8 Further Reading

- Google, *Site Reliability Engineering*, Chapter 15 (Postmortem Culture) — the foundational, widely-adopted treatment of blameless postmortems introduced in §24.2.
- John Allspaw, "Blameless PostMortems and a Just Culture" — an influential essay directly addressing why blame undermines the incident-learning process described in this chapter.

---
