## §51. Triage 101: "The Site Is Slow"

### 1. The Vocabulary

- **Triage** — the first-pass process of narrowing down "what kind of problem is this" before
  diving into a specific fix.
- **Application error vs. database error vs. network error vs. deployment error** — the four
  broad categories almost every production issue falls into, each with a different first place to
  look.
- **Reproducing the issue** — confirming you can trigger the same symptom, ideally with a
  narrower, more specific case than "it's slow" or "it's broken."

### 2. Where It Sits, and Why Teams Use It

"The site is slow" or "it's broken" is not a diagnosis — it's a starting point. A structured
triage process is what turns a vague report into an actual, narrowed-down hypothesis worth
investigating, without randomly checking things in whatever order comes to mind.

### 3. What Actually Breaks

- **Jumping straight to a specific fix before triaging broadly** — spending 20 minutes optimizing
  a query because "queries are usually the problem" when the actual issue is a deployment that
  just went out, or a downstream API that's degraded, wastes time on the wrong hypothesis.
- **Not checking recent changes first** — "what deployed in the last hour" is often the fastest,
  highest-hit-rate first question in a triage, and it's easy to skip in favor of jumping straight
  into logs or metrics.
- **Confusing "slow" with "erroring"** — these point in different directions: high latency with
  low error rate often points at a slow dependency or resource contention; high error rate points
  more at a hard failure (bad deploy, dependency down, bad input).
- **Not narrowing scope** — "the site is slow" for everyone, versus for one region, one endpoint,
  or one type of request, are very different investigations; narrowing which of those it actually
  is should happen early, not last.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "My first move on a vague report is narrowing scope — is it everyone or a subset, is it slow or
  erroring, and what changed recently."
- "I check recent deploys and config changes early in triage, because 'what changed' has a very
  high hit rate as the actual cause."
- "I try to reproduce the issue with a specific, narrow case before assuming I understand the
  root cause from the vague report alone."

### 5. Interview-Ready Answer

> "I treat 'the site is slow' as the start of an investigation, not a diagnosis. My first
> questions are: is this everyone or a subset, is it actually slow or is it erroring, and what
> changed recently — deploys, config, or dependency status. That narrowing usually points toward
> one of a few broad categories — application, database, network, or a bad deployment — fast, and
> from there I dig into the specific one instead of guessing across all of them at once."

### 6. Go Deeper

companion Software Systems Handbook's §48 (Observability Mechanics: metrics, OpenTelemetry,
tracing, logging) chapter; this book's own §101-108 (Common Why Did This Happen Situations) for
specific symptom-to-cause mappings.

---
