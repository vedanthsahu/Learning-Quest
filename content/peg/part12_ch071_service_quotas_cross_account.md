## §71. Service Quotas, Throttling, and Cross-Account Access

### 1. The Vocabulary

- **Service quota (limit)** — a cap on how much of a given resource or API call rate an account
  can use, set by the cloud provider (some are hard limits, many are soft limits that can be
  raised on request).
- **Throttling** — the API actively rejecting requests once a rate limit is hit, usually with a
  `429`-style response.
- **Cross-account access** — allowing a role or resource in one AWS account to be used from
  another, via an explicit trust relationship (not something that happens by default).
- **Multi-account strategy** — deliberately splitting workloads (dev/staging/prod, or by team)
  across separate cloud accounts for stronger isolation and clearer cost/security boundaries.

### 2. Where It Sits, and Why Teams Use It

Cloud providers impose limits specifically to protect their own infrastructure and to catch
runaway usage — but from the inside, hitting one unexpectedly looks like a mysterious, sudden
failure with no obvious code-level cause.

### 3. What Actually Breaks

- **A traffic spike hitting an API rate limit nobody knew existed** — requests start failing with
  throttling errors that look like an application bug, when the actual cause is simply exceeding
  a quota that was never checked or requested to be raised ahead of an expected launch/spike.
  This is exactly the kind of "casual knowledge" gap that's invisible until it isn't.
  Concrete example: Lambda has account-level and per-function concurrency limits — a sudden burst
  of invocations can hit that ceiling and start throttling new invocations, independent of
  whether the function code itself has any problem at all.
- **Assuming a quota increase request is instant** — many soft limits require submitting a
  request to the provider and waiting, sometimes days; requesting an increase the day before a
  known traffic event is often too late.
- **Cross-account access failing silently** — a role that should be assumable from another
  account doesn't work because the trust policy on one side, or the assume-role permission on the
  other, wasn't configured — with an access-denied error that doesn't always make which side is
  misconfigured obvious.
- **No multi-account isolation between environments** — dev, staging, and production sharing one
  account means a misconfigured test script or an over-permissioned dev credential has a blast
  radius that includes production, with much weaker isolation than separate accounts would
  provide.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I check relevant service quotas ahead of an expected traffic increase, not just scale the
  application and assume the platform has no limits of its own."
- "Throttling errors aren't automatically an application bug — I check whether a quota was hit
  before assuming the code is broken."
- "Cross-account access requires an explicit trust relationship on both sides — it's not implicit
  just because both accounts belong to the same organization."

### 5. Interview-Ready Answer

> "Cloud providers impose real quotas — API rate limits, concurrency limits, resource counts — and
> hitting one unexpectedly looks exactly like an application failure from the inside, throttling
> errors that have nothing to do with a code bug. I check relevant quotas ahead of any known
> traffic event, since many increases require a request to the provider and aren't instant. For
> cross-account access, I remember it's never implicit — it requires an explicit trust
> relationship configured on both the resource's side and the accessing role's side."

### 6. Go Deeper

companion Cloud Engineering Playbook's §29 (Account Governance: CloudTrail, Cost Management &
Multi-Account Basics) chapter and companion Cloud Engineering Playbook's §48 (Account &
Organization Design Guide) chapter (multi-account strategy in full).

---
