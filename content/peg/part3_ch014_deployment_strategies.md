## §14. Deployment Strategies: Rolling, Blue-Green, Canary, Feature Flags & Rollback

### 1. The Vocabulary

- **Rolling deployment** — replace instances a few at a time, so some old and some new versions
  run simultaneously during the rollout.
- **Blue-green** — two full environments; switch traffic all at once (§10).
- **Canary** — small-percentage traffic test before full rollout (§10).
- **Feature flag** — a runtime toggle that turns a piece of code on/off without a new deploy,
  decoupling "code is deployed" from "feature is live."
- **Rollback** — reverting to a previously known-good artifact when a deploy goes wrong.

### 2. Where It Sits, and Why Teams Use It

These are all different answers to "how do we change what's running with the least risk," each
with a different tradeoff between rollout speed, infrastructure cost (blue-green needs double the
capacity, briefly), and how fast you can undo a mistake.

### 3. What Actually Breaks

- **Rolling deploy with a breaking API/schema change** — during the rollout window, old and new
  code run side by side. If the new code writes data the old code can't read (or vice versa),
  you get real errors for real users during every single deploy, not just a rare edge case.
- **Feature flags left on forever** — a flag meant to be temporary that's never cleaned up becomes
  permanent hidden complexity and a forgotten source of "wait, why does this behave differently
  for some users."
- **Rollback that doesn't actually roll back the database** — reverting application code to a
  previous version while the database has already migrated forward is a classic way to make
  "rolling back" actively worse than the original bug.
- **No rehearsed rollback path** — the first time a team tries to roll back is mid-incident, and
  it doesn't work cleanly because it was never tested.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "A rolling deploy means two versions of the code run at once for a while — any schema or API
  change involved has to tolerate that."
- "Feature flags decouple deploying code from turning on a feature, which is genuinely useful for
  gradual rollout and instant kill-switches — but they need to be cleaned up once they're no
  longer needed."
- "Rollback plans that only cover the application, not the database, aren't complete rollback
  plans."

### 5. Interview-Ready Answer

> "I pick the deployment strategy based on how much I trust the change and how expensive a mistake
> would be. For most day-to-day changes, a rolling deploy with backward-compatible schema changes
> is enough. For riskier changes I'd use a canary to test on a small slice of real traffic before
> full rollout, and for anything I want instant control over independent of deploys, a feature
> flag. The one thing all of these need underneath them is a rollback plan that actually accounts
> for the database, not just the application code."

### 6. Go Deeper

companion Software Systems Handbook's §46 (CI/CD Mechanics: pipelines, blue-green, canary,
rolling) chapter (all deployment strategies compared in depth).

---
