## 48. Account & Organization Design Guide

### 48.1 The Problem This Chapter Solves

Companion §29 covered the governance *services* (CloudTrail, Cost Explorer, Budgets). This chapter is about the *structural* decision underneath them: how many AWS accounts should an organization actually have, and what goes in each — a decision every other chapter in this book's Tier 1/2 services eventually depends on getting right, since IAM blast radius, cost attribution, and compliance boundaries are all ultimately account boundaries.

### 48.2 Why a Single Account Eventually Breaks Down

A single AWS account works fine for a solo project or small team. It breaks down once: multiple teams need genuinely independent IAM boundaries (a bug in Team A's over-permissioned role shouldn't be able to touch Team B's production data); cost attribution across teams/projects becomes hard to disentangle even with disciplined tagging (companion §29); or compliance requirements need a hard, structural isolation boundary between environments, not just a naming convention and hope.

### 48.3 The Standard Multi-Account Shape

A common, well-tested starting structure:
```
Management Account (billing consolidation, Organizations root, no workloads run here)
       ↓
Security/Logging Account (Organization Trail destination, companion §29 -- centralized,
                            restricted-access audit log storage)
       ↓
Shared Services Account (CI/CD, shared tooling, a central artifact registry)
       ↓
Per-Environment or Per-Team Accounts:
   - dev account(s)
   - staging account(s)
   - production account(s)
```
The Security/Logging account existing *separately* from every workload account is the direct implementation of companion §29's recommendation that CloudTrail logs live somewhere an attacker who compromises a workload account can't reach or tamper with.

### 48.4 AWS Organizations and Service Control Policies

AWS Organizations groups accounts under one consolidated bill and lets you apply **Service Control Policies (SCPs)** — guardrails that restrict what even an account's own administrators can do (e.g., "no member account may disable CloudTrail," "no member account may create resources outside approved regions"). This is a genuinely different, stronger guarantee than IAM policies alone provide, since SCPs apply as an outer boundary no in-account permission can override.

### 48.5 Control Tower: Automating the Landing Zone

Manually building the account structure in §48.3, with consistent SCPs, logging, and account-vending, is real, repetitive setup work. **Control Tower** automates this — provisioning a well-architected multi-account "landing zone" with sane defaults (an Organization Trail already configured, guardrail SCPs already applied) and a self-service **Account Factory** for provisioning new, consistently-configured accounts as teams need them.

### 48.6 Tagging Strategy as a Cross-Account Concern

A tagging strategy (companion §29) needs to be consistent *across* accounts, not just within one, for organization-wide Cost Explorer rollups to be meaningful — a common, avoidable mistake is each team/account inventing its own tag keys/values independently, making organization-wide cost attribution effectively impossible after the fact.

### 48.7 A Decision Framework for Account Boundaries

Ask, for any proposed new account: does this genuinely need an independent IAM/billing/compliance boundary, or would a well-tagged set of resources within an existing account achieve the same practical isolation with less overhead? Creating an account is close to free (no direct cost beyond the setup effort), but each additional account is one more thing to keep consistently governed (tagged, logged, guard-railed) — account sprawl without a corresponding governance discipline recreates the single-account problem at a larger scale, just distributed across more places.

### 48.8 Common Mistakes

- Staying on a single account well past the point where multiple teams' blast radius and cost attribution genuinely need separation.
- Building a multi-account structure prematurely for a small team, adding governance overhead disproportionate to actual organizational complexity (companion §47.7's proportionality trap).
- Inconsistent tagging across accounts, undermining organization-wide cost visibility.
- Not using SCPs to enforce guardrails that matter organization-wide (e.g., "CloudTrail must always be enabled"), leaving that discipline to per-account convention instead of a structural guarantee.

### 48.9 Interview Questions
1. Why does a single AWS account eventually become an operational liability as an organization grows?
2. What's the practical difference between an IAM policy and a Service Control Policy?
3. Why should the logging/security account be genuinely separate from every workload account, not just logically distinguished?
4. What does Control Tower automate that you'd otherwise have to build by hand?
5. How would you decide whether a new team/project genuinely needs its own AWS account?

---
