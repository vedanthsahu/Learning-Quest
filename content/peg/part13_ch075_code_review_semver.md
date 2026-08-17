## §75. Code Review Etiquette, Branch Protection, and Semantic Versioning

### 1. The Vocabulary

- **Branch protection** — rules preventing direct pushes to a main/release branch, requiring PRs,
  passing checks, and often a minimum number of approvals.
- **Code owners** — a config mapping specific paths to specific required reviewers, so changes to
  sensitive areas automatically route to the right people.
- **Semantic versioning (semver)** — `MAJOR.MINOR.PATCH` — major for breaking changes, minor for
  backward-compatible additions, patch for backward-compatible fixes.
- **Changelog** — a maintained record of what changed in each release, so consumers can quickly
  see what's new or different without reading every commit.

### 2. Where It Sits, and Why Teams Use It

Branch protection and code review are the process-level enforcement of quality and safety
standards that individual discipline alone doesn't reliably guarantee at team scale; semver and
changelogs are how a project communicates the *nature* of its changes to everyone depending on
it, without them having to read the diff themselves.

### 3. What Actually Breaks

- **Reviewing for style nitpicks while missing actual logic issues** — a review that focuses
  entirely on formatting/naming while a real correctness or security issue goes unnoticed
  misses the actual point of review; automated linting/formatting tools should handle style so
  human review time goes toward logic, design, and edge cases.
- **No branch protection on main** — allows a direct push (accidental or otherwise) to bypass
  review and CI entirely, undermining the whole point of having a review process.
- **Version bumps that don't match the actual change** — labeling a breaking change as a minor or
  patch version misleads every consumer who trusts semver to decide whether it's safe to upgrade
  without reading the full changelog.
- **Reviews that are purely a rubber stamp** — an approval given without actually reading the
  change provides none of the real safety benefit review is supposed to provide, while still
  creating the appearance that a check occurred.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I let automated tools handle style/formatting so review time goes toward logic, design, and
  edge cases instead."
- "Branch protection on main isn't bureaucracy for its own sake — it's what actually makes 'every
  change goes through review and CI' a guarantee rather than a policy people can accidentally
  bypass."
- "I version bump based on the actual nature of the change — breaking changes get a major bump,
  regardless of how small the code diff looks."

### 5. Interview-Ready Answer

> "I think of code review's real value as catching logic, design, and edge-case issues — style and
> formatting should be handled by automated tooling so review time isn't spent there. Branch
> protection is what makes that review process an actual guarantee rather than something that can
> be accidentally bypassed with a direct push. And for versioning, I bump based on what the change
> actually does to the contract, not how large the code diff looks — a one-line change that breaks
> backward compatibility is still a major version bump."

### 6. Go Deeper

companion Software Systems Handbook's §46 (CI/CD Mechanics: pipelines, blue-green, canary,
rolling) chapter; this book's own §23 (API Versioning & Backward Compatibility).

---
