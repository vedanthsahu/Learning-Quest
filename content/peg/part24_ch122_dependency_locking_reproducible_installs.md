## §122. Dependency Locking and Reproducible Installs

### 1. The Vocabulary

- **Lockfile** (`poetry.lock`, `Pipfile.lock`, `requirements.txt` with pinned versions) — an exact,
  fully-resolved record of every installed package and version (including transitive dependencies),
  so the same install command produces the identical environment every time.
- **Transitive dependency** — a package your dependency depends on, which you never named directly
  but which still ends up installed and can still break your build.
- **Semantic versioning (semver)** — the `MAJOR.MINOR.PATCH` convention where major version bumps
  signal breaking changes — the reasoning behind version constraints like `^2.1.0` (allow
  compatible updates, block breaking ones).
- **Dependency confusion / supply-chain risk** — the class of security issue where a malicious
  package with a similar or matching name gets installed instead of the intended internal or
  trusted one.

### 2. Where It Sits, and Why Teams Use It

"It works on my machine" is very often, specifically, a dependency-version problem: your machine
has a package version installed from eight months ago, CI or a new teammate's machine installs the
latest version today, and a transitive dependency changed behavior in between. A lockfile is the
fix — it's committed to the repository specifically so `install` is deterministic across every
machine and every point in time, not just "whatever the latest compatible versions happen to be
today."

### 3. What Actually Breaks

- **No lockfile at all, only loose version ranges** — every fresh install is a small gamble; a CI
  run that passed yesterday can fail today with zero code changes, purely from a transitive
  dependency publishing a new version.
- **Lockfile committed but never regenerated** — dependencies silently drift out of date for
  months, including security patches, because nobody's re-running the update step.
- **Installing directly from a git branch or unpinned URL** — the "version" can change out from
  under you the next time someone force-pushes that branch, with no version bump to signal it.
- **Ignoring transitive dependency vulnerabilities** — a security scanner flags a vulnerable
  package you never directly installed; it's still in your build via a dependency's dependency,
  and still your problem to fix or work around.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I always commit the lockfile, and I treat 'works on my machine, fails in CI' as a strong signal
  to check for a dependency version mismatch first."
- "I know the difference between a direct dependency and a transitive one, and I know transitive
  dependencies can still be a real security or breakage risk."
- "I periodically regenerate the lockfile deliberately, as its own reviewed change, rather than
  letting it silently go stale."

### 5. Interview-Ready Answer

> "I treat the lockfile as the actual source of truth for what's installed, not the loose version
> ranges in `pyproject.toml` — it's what makes an install reproducible across my machine, CI, and
> production. When I see 'works locally, fails in CI' with no code changes, a dependency version
> drift is one of the first things I check. And I don't forget about transitive dependencies —
> a vulnerability scanner flagging something I never directly installed is still something I need
> to address, usually by bumping a direct dependency that pulls in a patched version."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §8 (Logging, Packaging, Virtual Environments &
Dependencies) chapter for the full lockfile mechanics; this book's §15 (secrets in CI/CD) for the
adjacent supply-chain-security concerns.

---
