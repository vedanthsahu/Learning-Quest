## 84. Stage 1,000 → 10,000 Users: Read Replicas, Load Balancer, Stateless App Tier, Queue Introduced

### 84.1 What Broke

At 10,000 users, two distinct, simultaneous problems appear. First, the single application server's CPU is now consistently saturated during peak hours, and vertical scaling (§18.4 — simply provisioning a larger single machine) has already been tried once as a stopgap and has hit a practical ceiling: the next size tier is disproportionately expensive and the team can see this pattern will recur. Second, session data (users' login state) is currently held in the single application server's local memory — a decision nobody explicitly made; it was simply the framework's default — and any attempt to add a second server to address the CPU problem immediately causes random, infuriating logout bugs, since a user's session might now be handled by a server that never saw them log in.

### 84.2 Why It Broke

The CPU saturation is an ordinary capacity failure (§1.3.1) — the single-server architecture from Stage 0-1 has finally, genuinely reached the ceiling that vertical scaling alone cannot economically push further (§18.4's explicit "horizontal scaling has no inherent ceiling; vertical does" distinction). The session bug is a direct, textbook violation of the statelessness principle from §18.5: the application server was never actually stateless, and that fact was invisible and harmless right up until the moment horizontal scaling was attempted, at which point it became an immediate, user-visible correctness bug — exactly the "statelessness is the hinge horizontal scaling depends on" lesson from §18.5, learned here the hard way rather than planned for in advance.

### 84.3 Candidate Fixes

- **Fix A: Move session storage to a shared backing store** (a fast, shared cache, §10, holding session data so any application server instance can serve any user's request) **and add a load balancer (§28) in front of multiple, now-genuinely-stateless application server instances.**
- **Fix B: Use sticky sessions (§28.3's consistent-hashing-based session affinity) to route each user consistently to the same server, avoiding the need to externalize session storage at all.**
- **Fix C: Continue vertical scaling, accepting the increasing cost, to defer this architectural change further.**

### 84.4 Which Fix Was Chosen, and Why

**Fix A.** Fix B (sticky sessions) is a real, valid pattern in general (§28.3), but it doesn't actually solve Loop's stated problem here — it still leaves each user's session tied to a single specific server, meaning that server's failure still logs that user out, and it does nothing to enable clean, even load distribution when servers are added or removed, which Loop will need repeatedly and increasingly as it continues to grow. Fix C has a hard, already-observed ceiling (§84.1) and postpones an inevitable architectural change at increasing, compounding cost. Fix A is chosen because it is the only option that actually delivers genuine statelessness (§18.5) — the property that makes every future horizontal scaling decision simple rather than a repeated, one-off negotiation.

Alongside this primary fix, one further change is introduced proactively rather than reactively: a **message queue** (§11, §40) is added for the first genuinely asynchronous operation Loop now has enough volume to justify — sending notification emails when a user is followed or receives a comment. At Stage 0-1 volume, doing this synchronously inline was invisible; at 10,000 users, a slow third-party email provider occasionally adding several seconds of latency to an otherwise-fast request is now a real, measurable tail-latency problem (§50.3-50.4), and moving this specific, genuinely-non-blocking operation to a queue directly addresses it, following exactly §11.2's original motivating logic.

### 84.5 What This Fix Made Possible, and What New Failure Mode It Introduced

Genuine statelessness (§18.5) plus a load balancer (§28) means Loop can now scale its application tier horizontally, simply and repeatedly, as future growth demands — the single most consequential architectural unlock in this Part so far, since nearly every subsequent stage's growth depends on this capability already being in place. The queue introduces Loop's first real instance of the delivery-guarantee and idempotency considerations from §40.2 and §29.8: the notification-sending consumer must now be designed to handle the possibility of processing the same notification-request message more than once (a transient failure and retry, §40.2.1) without sending a duplicate email — a new correctness requirement that didn't exist when this code ran synchronously and exactly once, inline, per request.

### 84.6 Retrospective: Architecture Decision Record

```
ADR-004: Externalize session storage, introduce a load balancer
and horizontally-scaled stateless application tier, and introduce
a message queue for notification delivery

Context: Single-server vertical scaling has hit a practical cost
ceiling, and an attempted second server revealed the application
was never actually stateless (session data held in local memory).

Decision: Move session storage to a shared cache; deploy multiple
application server instances behind a load balancer; introduce a
message queue for asynchronous notification email delivery.

Alternatives considered:
  - Sticky sessions (§84.3, Fix B): rejected — does not deliver
    genuine statelessness or resolve single-server-failure risk
    for a given user's session.
  - Continued vertical scaling (Fix C): rejected — already
    demonstrated to have an uneconomical ceiling.

Consequence: The application tier can now scale horizontally as
a matter of routine, not a one-off architectural event. The
notification consumer must now be explicitly idempotent
(§29.8, §40.2.1) — a new correctness requirement introduced by
this change, tracked and tested for going forward.
```

### 84.7 Engineering Intuition for This Stage

> **How do I know if a scaling problem is a statelessness problem in disguise?** If adding a second server introduces new, previously-nonexistent correctness bugs (rather than simply working, only faster), the application was never actually stateless, and that latent issue has just become visible for the first time (§84.2).
>
> **What would under-fixing this look like?** Adopting sticky sessions (Fix B) as a quick patch — it removes the *immediate* symptom (random logouts) without addressing the underlying architectural gap, and the team would face this exact same decision again, at greater cost, the next time genuine load-balanced scaling is needed.
>
> **Why introduce a queue now, and not sooner or later?** Because this is the first point where a specific, real operation (third-party email delivery) has enough volume and enough latency variability to matter (§50.4's tail-latency reasoning) — introducing a queue at Stage 0 would have been solving a problem that didn't exist yet, and delaying it further would mean shipping a known, already-diagnosed tail-latency issue to users unnecessarily.

### 84.8 Exercises

1. A teammate proposes sticky sessions as a faster, simpler fix than externalizing session storage. Using §84.4, write the argument for why this doesn't actually solve Loop's stated problem, referencing what still breaks under this approach.
2. The new notification queue consumer is deployed without idempotency protection, and a transient network blip causes a batch of users to receive duplicate "you have a new follower" emails. Using §84.5, §40.2.1, and §29.8, diagnose the specific missing safeguard and describe how to add it.

---
