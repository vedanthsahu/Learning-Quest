## 82. Stage 10 → 100 Users: First Bottlenecks, First Monitoring, First Backups

### 82.1 What Broke

Loop grew to 100 users via word of mouth. Nothing has caught fire — there is no dramatic outage to report. But two specific, real incidents occurred: first, the single database's disk filled up unexpectedly (nobody had been watching disk usage, because nobody was watching *anything* — §81.4's "basic logging" was never actually reviewed by a human), causing writes to fail silently for several hours before a user complaint revealed it. Second, a routine server reboot (a provider-initiated maintenance event, entirely ordinary infrastructure behavior) took the single application instance down for four minutes, and there was no way to know this had happened except that the founder happened to try loading the app during those four minutes.

### 82.2 Why It Broke

Both incidents trace to the exact same root cause, not two separate problems: **the absence of observability** (§16.2) at a scale where "the founder will notice" (§81.4's implicit incident response process) stopped being a reliable detection mechanism the moment usage grew past what one person could personally track. This is a failure of capacity in the taxonomy from §1.3.1 — not compute or storage capacity, but *attention* capacity — and it is entirely expected and appropriate that it manifested exactly once single-person informal monitoring stopped scaling, not before.

### 82.3 Candidate Fixes

- **Fix A: Add basic monitoring and alerting (§16, §57.2) plus automated backups.** Cost: low — a managed monitoring service and a scheduled, automated database backup are both cheap, quick to set up, and require no architectural change.
- **Fix B: Migrate to a fully redundant, multi-instance architecture immediately** (application replicas behind a load balancer, database replication, §8.2, §34). Cost: significant — introduces real architectural complexity (statelessness requirements, §18.5; replication lag considerations, §34.4) that the current 100-user, single-founder-team scale does not yet justify.
- **Fix C: Do nothing, and rely on the cloud provider's stated reliability guarantees.** Cost: apparently free, but leaves the exact detection gap from §82.2 completely unaddressed — the provider's infrastructure reliability was never the problem; not knowing when something goes wrong was.

### 82.4 Which Fix Was Chosen, and Why

**Fix A.** The actual root cause (§82.2) is a detection gap, not a redundancy gap — the four-minute reboot and the disk-full incident were both individually survivable blips that became real incidents specifically because nobody knew they were happening. Basic monitoring and alerting directly closes that gap at minimal cost. Fix B solves a problem Loop doesn't have yet (100 users on a single, reasonably-provisioned server is not remotely close to any real capacity ceiling, §81.3's estimation logic extended forward) while introducing real complexity Loop isn't yet equipped to operate. Fix C ignores the demonstrated, real cost of the status quo.

### 82.5 What This Fix Made Possible, and What New Failure Mode It Introduced

Monitoring and alerting (§16.2, §48.2) now mean the team learns about problems within minutes rather than from user complaints — a direct, concrete instance of §24.3's detection phase finally existing at all. Automated backups (a direct, simple instance of the durability concern from §6.6, applied operationally rather than at the storage-engine level) mean a future disk or data corruption incident is recoverable rather than catastrophic. The new failure mode this introduces, previewed here and payable later: **alert fatigue** (§57.2) is not yet a risk at this alert volume, but the alerting thresholds chosen now, without much data to calibrate against, are likely to need retuning as real traffic patterns emerge — an explicit, acknowledged debt rather than an oversight.

### 82.6 Retrospective: Architecture Decision Record

```
ADR-002: Add monitoring, alerting, and automated backups

Context: Two incidents (silent disk-full failure, undetected
brief outage) both traced to a complete absence of observability,
not to any genuine capacity or redundancy shortfall.

Decision: Adopt a managed monitoring/alerting service covering
disk usage, error rate, and basic uptime; configure automated,
scheduled database backups with periodic restore testing.

Alternatives considered:
  - Full redundant multi-instance architecture: rejected as
    premature (§82.3, Fix B) — current single-instance capacity
    is not close to any real ceiling.

Consequence: Detection gap closed. Alert thresholds are a first,
uncalibrated guess and are expected to need adjustment as real
traffic data accumulates (§82.5).
```

### 82.7 Engineering Intuition for This Stage

> **How do I know if my problem is a detection problem or a capacity problem?** Ask whether the underlying resource (disk, CPU, uptime) was actually insufficient, or whether it was sufficient but nobody knew it had temporarily failed — §82.2's incidents were unambiguously the latter, and the fix follows directly from that diagnosis.
>
> **What would over-fixing this look like?** Jumping straight to Fix B's full redundant architecture in response to two incidents that were actually about missing observability, not missing redundancy — solving the wrong layer of the problem, at real, unnecessary cost.
>
> **What's the minimum viable monitoring setup at this stage?** Uptime/error-rate alerting and disk/resource-usage alerting, per §82.5 — a small, cheap set of signals directly tied to the specific incidents that just occurred, not a comprehensive observability platform (§48) that this stage's scale doesn't yet justify.

### 82.8 Exercises

1. A teammate proposes skipping monitoring and going straight to a fully redundant, multi-region architecture "to prevent this from ever happening again." Using §82.4's reasoning, write the counter-argument.
2. Identify what specific alert thresholds you would set for disk usage and error rate at this stage, and explain, using §82.5, why you'd expect to revisit them later rather than treating them as permanent.

---
