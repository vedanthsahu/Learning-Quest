## §73. Merge vs Rebase vs Squash

### 1. The Vocabulary

- **Merge commit** — combines two branches' histories with an explicit commit recording the
  merge, preserving both branches' full individual commit history.
- **Rebase** — replays one branch's commits on top of another, producing a linear history with no
  merge commit, but rewriting commit hashes in the process.
- **Squash merge** — combines all of a branch's commits into a single new commit when merging,
  discarding the individual intermediate commits.

### 2. Where It Sits, and Why Teams Use It

These are three different philosophies for what a project's history should look like — full and
messy but complete (merge), clean and linear but rewritten (rebase), or simplified to one commit
per logical unit of work (squash) — and different teams have legitimate, different preferences.

### 3. What Actually Breaks

- **Rebasing a branch other people have already pulled** — rebase rewrites commit hashes; anyone
  who already has the old commits will get confusing divergent history when they next pull,
  because as far as Git is concerned, the rebased commits are entirely new and different objects.
- **Squash-merging a branch with commits that should stay separate for bisecting** — squashing a
  PR that actually contains several logically distinct changes into one commit makes `git bisect`
  (binary-searching history for which commit introduced a bug) less precise, since the whole PR
  becomes one indivisible unit.
- **Mixing strategies inconsistently across a team** — some engineers merge, some rebase, some
  squash, with no agreed convention, producing a genuinely confusing, inconsistent history that's
  harder to read for everyone.
- **Force-pushing after a rebase without communicating it** — required after rebasing a branch
  that's already been pushed, but a force-push on a shared branch with no warning can silently
  discard others' local work if they're not careful.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Rebase is safe on a branch only I'm working on, and risky the moment someone else has already
  pulled it."
- "Squash merging is great for keeping the main branch's history clean and one-commit-per-PR, at
  the cost of losing intermediate commit granularity for bisecting."
- "I follow whatever convention the team has already agreed on, rather than mixing strategies
  based on personal preference."

### 5. Interview-Ready Answer

> "The real distinction is what history you end up with. Merge preserves everything, including
> the mess, with an explicit merge commit. Rebase produces a clean, linear history but rewrites
> commit hashes, which makes it risky on a branch anyone else has already pulled. Squash
> simplifies a whole PR into one commit, trading away intermediate-commit granularity for a
> cleaner main-branch history. I pick based on team convention rather than personal preference,
> and I specifically avoid rebasing shared branches other people have already pulled from."

### 6. Go Deeper

companion Software Systems Handbook's §46 (CI/CD Mechanics: pipelines, blue-green, canary,
rolling) chapter (branching conventions as part of the broader release process).

---
