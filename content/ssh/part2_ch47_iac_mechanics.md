## 47. Infrastructure as Code Mechanics: Terraform State, Drift, Modules, GitOps

### 47.1 What This Chapter Adds to §15.4

§15.4 established why infrastructure should be defined as versioned, reviewable code rather than manual console changes. This chapter covers the concrete mechanism that makes this work in practice: state tracking, the drift problem, reusable modules, and the GitOps operating model.

### 47.2 The State File: How IaC Tools Know What They've Already Created

An Infrastructure as Code tool (Terraform being the most widely used example) needs to know not just what infrastructure you've *declared* you want, but what infrastructure currently *actually exists* that it previously created, in order to compute the difference and apply only the necessary changes. This is tracked in a **state file** — a record mapping each resource in your declared configuration to the real, provider-specific resource it corresponds to (a specific server ID, a specific database instance identifier). Every time you apply a change, the tool reads the current state, compares it against your declared configuration, computes a **plan** (what needs to be created, modified, or destroyed to reconcile the two), and — after you review and approve that plan — executes it and updates the state file to reflect the new reality. This state file is itself a critical, sensitive artifact: losing it means the tool no longer knows what it previously created, and it is why state files are typically stored in shared, durable, locked storage (so two people running a change simultaneously don't corrupt it via a race condition, directly echoing the concurrency concerns from §26) rather than kept locally on one engineer's machine.

### 47.3 Drift: When Reality Diverges From the Declared State

**Configuration drift** occurs when the real infrastructure's actual state diverges from what the IaC tool's state file believes it to be — most commonly because someone made a manual, out-of-band change directly (exactly the manual-console-change practice §15.4 argues against), but also possible from a resource being modified or deleted by an unrelated automated process. Drift is dangerous specifically because it undermines the entire premise of declarative infrastructure management (§14.4's principle, now applied to infrastructure provisioning rather than container orchestration): the tool's next planned change is computed based on what it *believes* exists, and if that belief is wrong, the resulting plan can have unexpected, sometimes destructive consequences (attempting to "fix" a manually-changed resource by reverting it, or failing outright because the resource it expects no longer matches what's actually there). Detecting drift (via periodic reconciliation runs comparing declared state against actual live infrastructure) and enforcing that all changes flow exclusively through the IaC pipeline, never through manual console access, are the two standard mitigations.

### 47.4 Modules: Making Infrastructure Definitions Reusable

Just as ordinary software avoids duplicating logic via functions and libraries, IaC definitions avoid duplicating infrastructure patterns via **modules** — a reusable, parameterized package defining a common infrastructure pattern (e.g., "a standard web application stack: a load balancer, an auto-scaling group of application servers, and a database") that can be instantiated multiple times with different parameters (different environments, different regions) rather than copy-pasted and manually kept in sync across every instantiation. This directly extends the DRY (don't-repeat-yourself) principle from ordinary software engineering into infrastructure definitions, and it provides the same benefit software modules provide: a bug fix or improvement made once, in the module, propagates to every place that uses it, rather than needing to be manually replicated across every duplicated copy.

### 47.5 GitOps: Git as the Single Source of Truth for Infrastructure State

**GitOps** is an operating model built on top of the IaC and reconciliation principles already covered: the desired state of infrastructure (and often application deployments as well) is declared entirely in files stored in a Git repository, and an automated process continuously ensures the live environment matches whatever is currently committed to a specific branch — meaning the *only* way to change infrastructure is to commit a change to that Git repository (going through code review, exactly like any other code change, per §15.2's CI discipline), never through direct, manual application of a change from an engineer's local machine. This directly and structurally prevents the drift problem from §47.3: because the automated reconciliation process is the *only* path by which changes are ever applied, and it continuously re-applies whatever the Git repository currently declares, any manual, out-of-band change is automatically detected and reverted back to match the declared state on the next reconciliation cycle, rather than silently persisting as undetected drift.

```
GitOps flow:

  Engineer -> commits change to infrastructure repo (Git)
                        |
                        v
              Pull request + code review  (same discipline as
                        |                   application code, §15.2)
                        v
                merge to main branch
                        |
                        v
     automated agent continuously watching the repo
     detects the new commit and applies it to the
     live environment
                        |
                        v
     agent continuously re-checks: does live environment
     still match the repo? If anything drifts (manual
     change, external interference), automatically
     reconcile back to match the repo's declared state.
```

### 47.6 Common Mistakes and Production Debugging Signals

- Storing an IaC state file locally on one engineer's machine rather than in shared, locked storage, leading to state file loss or corruption when multiple engineers apply changes concurrently (§47.2), directly analogous to the shared-mutable-state hazards from §26.2 now occurring at the infrastructure-management layer.
- Making a "quick," manual, out-of-band change directly in a cloud console under time pressure (bypassing the declared configuration entirely), introducing drift (§47.3) that surfaces later as a confusing, seemingly-unprovoked change or failure the next time the IaC tool runs and tries to reconcile against its outdated understanding of reality.
- Duplicating near-identical infrastructure definitions across multiple environments instead of parameterizing a shared module (§47.4), leading to environments silently diverging over time as each copy is edited independently and inconsistently.

### 47.7 Engineering Intuition

> **How do I know configuration drift has occurred?** Run a plan/diff operation (without applying) and check whether it reports unexpected changes to resources nobody intentionally modified through the declared configuration — any such diff is drift by definition.
>
> **What symptoms indicate a drift problem specifically?** An IaC apply operation proposing to "fix" or revert something that was actually an intentional manual change nobody documented, or failing unexpectedly because a resource's actual state no longer matches what the tool's state file believes.
>
> **What metrics indicate it?** Frequency and magnitude of detected drift on periodic reconciliation runs — a healthy, disciplined environment should show this at or near zero.
>
> **What breaks first if manual changes are allowed alongside IaC?** The state file's understanding of reality becomes unreliable, and subsequent automated changes can have surprising, occasionally destructive consequences based on stale assumptions about what currently exists.
>
> **When is a lighter-weight IaC approach (no full GitOps automation) acceptable?** Small teams and infrastructures can reasonably apply IaC changes manually from a local machine, provided real discipline is maintained around never making changes outside that process — GitOps' fully automated reconciliation is a stronger, more scalable guarantee, but not strictly required at very small scale.
>
> **What would a hyperscale company do?** Enforce GitOps as a mandatory, tooling-enforced policy (no direct console access permitted for changes at all, in the strictest implementations), use extensively parameterized shared modules across all environments, and monitor for drift continuously as a standard operational practice (§68).
>
> **What would a two-person startup do?** Use a straightforward IaC tool applied manually (but disciplined) from a shared, controlled process, store state in the managed remote backend their tool provides by default, and adopt a small number of simple, shared modules rather than a large, formal module library.
>
> **What changes with scale?** At a small number of resources managed by a small team, informal discipline around avoiding manual changes is often sufficient. As team size and infrastructure complexity grow, the risk of accidental drift and the coordination cost of manual application both increase to the point where full GitOps automation and rigorous shared modules become necessary to keep infrastructure changes safe and consistent (§68).

### 47.8 Exercises

1. An engineer makes an urgent, manual change directly in the cloud console during an incident, and a week later, a routine IaC apply unexpectedly reverts that change, causing a recurrence of the original problem. Using §47.3, explain exactly what happened and what process change (per §47.5) would prevent it going forward.
2. Explain, using §47.2, why an IaC tool's state file is a sensitive, critical artifact that must be stored securely and with locking, and what could go wrong if two engineers applied conflicting changes to the same infrastructure simultaneously without such locking.

### 47.9 Further Reading

- HashiCorp, "Terraform State" (official documentation) — the authoritative reference on state management, drift, and locking underlying §47.2-47.3.
- Weaveworks, "GitOps - Operations by Pull Request" — the original articulation of the GitOps model described in §47.5.

---
