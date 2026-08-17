## §12. CI/CD Pipeline Anatomy

### 1. The Vocabulary

- **CI (Continuous Integration)** — automatically building and testing every change.
- **CD (Continuous Delivery/Deployment)** — automatically getting a tested change into an
  environment (Delivery: ready to deploy with a manual trigger; Deployment: fully automatic).
- **Pipeline** — the ordered sequence of steps: install dependencies, lint, test, build, package,
  deploy.
- **Artifact** — the packaged output of a build (a zip, a binary, a Docker image) that gets
  promoted through environments unchanged.
- **Manual approval / gate** — a deliberate human checkpoint before a pipeline proceeds, usually
  before production.

### 2. Where It Sits, and Why Teams Use It

This is the automated safety net between "a developer wrote code" and "that code is running in
front of users." Every check in the pipeline exists to catch a specific class of mistake before a
human has to catch it manually or, worse, a user does.

### 3. What Actually Breaks

- **Building a new artifact per environment** — if staging and production get *separately built*
  artifacts (even from the "same" code), you've reintroduced the exact risk CI/CD is supposed to
  remove: what you tested isn't quite what you shipped. Build once, promote the same artifact.
- **"CI passed" being treated as "definitely correct"** — CI only catches what its tests actually
  cover; a green pipeline plus a real gap in test coverage is a false sense of safety, not a
  guarantee.
- **Secrets printed in build logs** — a debug `print(os.environ)` or a verbose CI log that
  happens to include a token means that secret is now sitting in a log store, often accessible to
  more people than the secret itself was ever meant for.
- **No rollback plan** — a pipeline that can deploy forward but has no fast, tested way to
  redeploy the previous artifact turns every bad release into a scramble.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I build one artifact and promote it unchanged through environments, rather than rebuilding
  per environment."
- "A green CI pipeline means the tests that exist passed — it's not a substitute for actually
  knowing what's covered and what isn't."
- "I never let secrets get anywhere near a log — not env dumps, not verbose debug output in CI."

### 5. Interview-Ready Answer

> "A CI/CD pipeline is really a sequence of increasingly expensive checks — lint and unit tests
> first because they're fast, integration tests and build next, then packaging into a single
> artifact that gets promoted unchanged through each environment. The discipline that matters most
> is building once and promoting that exact artifact, rather than rebuilding separately per
> environment, because otherwise 'it passed CI' doesn't actually guarantee what's running in
> production is what was tested."

### 6. Go Deeper

companion Software Systems Handbook's §46 (CI/CD Mechanics: pipelines, blue-green, canary,
rolling) chapter (build pipelines, artifact promotion, deployment strategies in full depth).

---
