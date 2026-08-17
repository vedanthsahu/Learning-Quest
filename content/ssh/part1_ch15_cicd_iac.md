## 15. Mental Model: CI/CD and Infrastructure as Code

### 15.1 The Problem: Manual Steps Are Where Reliability Goes to Die

Every manual step in getting code from a developer's machine into production — manually running tests, manually copying files to a server, manually clicking through a cloud console to provision a resource — is a step that depends on a human doing the same thing correctly, every time, under time pressure, often at the worst possible moment (an urgent hotfix). Manual processes do not scale reliably with team size or deploy frequency, and they are exactly the "failures of human process" category from §1.3.5: not because people are careless, but because the system made the correct action effortful and the incorrect action easy. **CI/CD** and **Infrastructure as Code** are the two major disciplines built to remove manual, error-prone steps from, respectively, shipping code and provisioning infrastructure. Pipeline mechanics, deployment strategies, and Terraform-style state management are deferred to Pass 2, §46–47.

### 15.2 Continuous Integration: Catching Problems While They're Small

**Continuous Integration (CI)** is the practice of automatically building and testing every change, frequently, rather than letting changes accumulate before being combined and tested together. The problem it solves is straightforward: the longer two people's changes diverge before being tested together, the more likely they are to conflict in ways that are expensive to untangle, and the harder it is to tell which specific change introduced a given failure. By integrating and testing constantly, in small increments, CI keeps the "blast radius" (§1.3.3) of any single problem small and easy to attribute.

### 15.3 Continuous Delivery/Deployment: Making Releasing Boring

**Continuous Delivery** extends this idea to the release process itself: every change that passes its automated checks is automatically prepared to be released (and, in the "Continuous Deployment" variant, automatically released) without a human manually performing the mechanical steps of packaging, copying, and restarting services. The underlying motivation is the same one from §15.1 — manual release steps are risky and inconsistent — combined with a second, less obvious benefit: when releasing is fully automated and cheap, it can happen far more often, in far smaller increments, which means any single release carries far less risk than an infrequent, large, manually-orchestrated one. Deployment strategies that further reduce the risk of any single release (blue-green, canary, rolling) are mechanisms developed in §46, but the mental model to hold now is: automation isn't only about saving effort, it changes the size and risk profile of each unit of change.

### 15.4 Infrastructure as Code: The Same Argument, Applied to Servers Instead of Software

§15.1's argument against manual steps applies with equal force to infrastructure itself: manually clicking through a cloud console to create a server, a database, or a network configuration is undocumented, unrepeatable, and impossible to review before it takes effect. **Infrastructure as Code (IaC)** applies the same discipline used for application code — write the desired infrastructure as a versioned, reviewable text file, and use a tool to make reality match that file — to the machines, networks, and services a system runs on. This gives infrastructure changes the same properties application code changes get from version control: a reviewable diff before the change happens, a history of every past change, and the ability to reliably recreate an entire environment from the same description.

### 15.5 The Shared Underlying Principle

CI/CD and IaC are frequently taught as separate topics, but they are the same idea applied to two different targets: **remove manual, unrepeatable, unreviewed human action from any process that changes what's running**, and replace it with an automated, auditable, repeatable process driven from a versioned description. This is a direct, structural answer to the "change pressure" identified in §1.1 — these disciplines exist specifically so that a system can be modified continuously, by many people, without each change being a fresh opportunity for an undetected mistake.

### 15.6 Engineering Intuition

> **How do I know I need CI/CD?** The moment more than one person is regularly changing the same codebase, or the moment a release process involves more than a couple of manual steps that could plausibly be forgotten or done inconsistently.
>
> **How do I know I need Infrastructure as Code?** The moment your infrastructure setup could not be confidently recreated from scratch without someone remembering (or reverse-engineering) a series of manual console clicks.
>
> **What symptoms indicate these are missing?** "Deploy day" being a stressful, special event rather than routine; incidents traced back to "someone changed a setting in the console and nobody else knew"; an environment that cannot be reproduced identically for testing or disaster recovery.
>
> **What metrics indicate it?** Deploy frequency and lead time (both key DORA metrics); rate of incidents specifically attributable to deployment or configuration mistakes rather than code defects.
>
> **What breaks first if you skip this?** Deploys become rarer and larger (because they're risky and painful), which — counterintuitively — makes each one riskier still, since more changes are bundled into each release, precisely the opposite of §15.2's incremental-risk-reduction goal.
>
> **When is a lighter-weight approach acceptable?** A very small, single-developer project with infrequent, low-stakes changes may reasonably defer full CI/CD and IaC investment — the setup cost of either discipline is not free, and a single careful person can substitute for automation at very small scale, temporarily.
>
> **What would a hyperscale company do?** Deploy continuously (often many times per day, per service), with every piece of infrastructure defined as code and every change passing through automated pipelines, because at their scale and team count, manual processes would be both physically impossible and catastrophically risky (§70).
>
> **What would a two-person startup do?** Set up a basic CI pipeline (automated tests on every change) and a simple deployment automation early, since the setup cost is low relative to the risk it removes, even at small scale — this is one of the few "heavyweight-sounding" practices worth adopting essentially immediately.
>
> **What changes with scale?** The core practices are valuable from very early on, unlike some other patterns in this book. What changes with scale is *sophistication*: a startup's CI/CD might be one simple pipeline; a hyperscale company's spans thousands of services with progressive delivery, automated rollback, and policy enforcement across every single change (§70).

### 15.7 Exercises

1. Describe your own (or a system you know's) release process step by step. Identify every manual step, and for each, name the specific mistake that step's automation would prevent.
2. Explain, using only §15.3, why deploying smaller changes more frequently is generally *less* risky than deploying larger changes less frequently, even though the total amount of code shipped over a month may be identical.

### 15.8 Further Reading

- Jez Humble & David Farley, *Continuous Delivery* — the foundational text defining and motivating the practices in §15.2–15.3.
- HashiCorp, "What is Infrastructure as Code?" — an accessible practitioner introduction bridging §15.4's conceptual framing to the Terraform-style mechanics developed in §47.

---
