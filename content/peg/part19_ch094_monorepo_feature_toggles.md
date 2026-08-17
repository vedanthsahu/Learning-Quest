## §94. Monorepo vs Polyrepo, and Feature Toggles vs Environment Config

### 1. The Vocabulary

- **Monorepo** — all (or most) of an organization's code lives in one repository, versioned and
  released together (or with fine-grained sub-project tracking within it).
- **Polyrepo** — each project/service has its own separate repository.
- **Feature toggle (flag)** — a runtime switch turning a piece of functionality on/off, decoupled
  from deployment (§14).
- **Environment config** — settings that vary by environment (dev/staging/prod) but represent the
  *same* behavior everywhere, just pointed at different infrastructure (§11) — a fundamentally
  different concept from a feature toggle, even though both are sometimes implemented as
  environment variables.

### 2. Where It Sits, and Why Teams Use It

Both of these are "which of two reasonable approaches do we pick" decisions that come up
constantly, each with genuine tradeoffs rather than one obviously correct answer — the sign of
real experience is being able to articulate the tradeoff, not just have a preference.

### 3. What Actually Breaks

- **Monorepo tooling not scaling with size** — build times, CI duration, and IDE responsiveness
  can all degrade as a monorepo grows, unless specifically invested in (incremental builds,
  affected-project detection); "just put everything in one repo" without that investment can
  become a real productivity drag.
- **Polyrepo cross-project changes becoming painful** — a change that spans multiple services
  each in their own repo requires coordinating multiple PRs, multiple review cycles, and multiple
  deploys, which a monorepo's atomic cross-project commits avoid entirely.
- **Confusing a feature toggle with environment config** — using the same mechanism (an env var)
  for both without distinguishing them conceptually means a toggle meant to be a temporary,
  user-facing on/off switch gets tangled up with genuinely environment-specific infrastructure
  settings, making both harder to reason about and clean up.
- **Feature toggles that never get removed** — same issue as §14: a flag left in place long after
  the feature has fully shipped (or been abandoned) becomes permanent hidden complexity nobody
  remembers the reason for.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Monorepo makes cross-project changes atomic but needs real tooling investment to scale;
  polyrepo isolates projects cleanly but makes cross-project changes more coordination-heavy —
  I'd pick based on how often cross-project changes actually happen."
- "I keep feature toggles and environment config conceptually separate, even if they're
  technically implemented similarly, since they answer different questions — 'is this feature on'
  vs. 'which infrastructure am I pointed at.'"
- "I track feature toggles as debt to be removed once a feature is fully shipped, not permanent
  fixtures."

### 5. Interview-Ready Answer

> "Monorepo versus polyrepo is a real tradeoff, not an obvious choice — monorepo makes
> cross-project changes atomic and easier to coordinate, at the cost of needing real tooling
> investment to keep builds and CI fast as it grows; polyrepo isolates projects cleanly, at the
> cost of cross-project changes needing multiple coordinated PRs. For feature toggles, I keep them
> conceptually distinct from environment config even when implemented similarly, since one answers
> 'is this feature currently on' and the other answers 'which infrastructure am I pointed at' —
> and I track toggles as debt to remove once they're no longer needed, not permanent fixtures."

### 6. Go Deeper

companion Software Systems Handbook's §46 (CI/CD Mechanics: pipelines, blue-green, canary,
rolling) chapter (feature flags, release strategies in full).

---
