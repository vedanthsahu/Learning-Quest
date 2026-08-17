## §72. Git Workflow Basics: Branches, PRs, and Merge Conflicts

### 1. The Vocabulary

- **Branch** — an independent line of development off the main history.
- **Pull Request (PR)** — a request to merge one branch's changes into another, with review
  attached.
- **Merge conflict** — Git can't automatically combine two changes because they touched
  overlapping lines (or one branch modified something the other deleted), and needs a human
  decision.
- **`.gitignore`** — a file listing paths Git should never track (build artifacts, secrets,
  local config).

### 2. Where It Sits, and Why Teams Use It

This is the daily-driver workflow almost every team uses, and while the individual commands are
simple, the judgment around *when* to branch, how small to make a PR, and how to resolve a
conflict correctly (not just "make the red text go away") is where real experience shows.

### 3. What Actually Breaks

- **Resolving a merge conflict by blindly picking one side** — a conflict marker resolved by just
  deleting one side without understanding what both changes were actually trying to do can
  silently discard a real, intended change.
- **Committing a secret or generated file because `.gitignore` wasn't set up first** — once
  something is committed, removing it from the latest commit doesn't remove it from history (see
  §15) — `.gitignore` needs to be right from the start of a project, not retrofitted after a leak.
- **Huge, sprawling PRs** — a PR touching dozens of unrelated files is both hard to review
  meaningfully and hard to revert cleanly if something in it turns out to be wrong; smaller,
  focused PRs are easier to reason about at every stage.
- **Force-pushing over a shared branch** — rewriting history on a branch other people have already
  pulled creates confusing, hard-to-recover divergence for everyone else working from it.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "When resolving a merge conflict, I understand what both sides were actually trying to do before
  picking a resolution — not just clear the markers."
- "I set up `.gitignore` at the start of a project, since removing something from git history
  later is much harder than never committing it."
- "I keep PRs small and focused where practical, since that's both easier to review and easier to
  revert if something's wrong."

### 5. Interview-Ready Answer

> "The mechanics of branching and merging are straightforward — the judgment is in how I use
> them. I keep PRs small and focused so they're actually reviewable and revertible, I resolve
> merge conflicts by understanding what both changes intended rather than just picking a side, and
> I treat force-pushing a shared branch as something to avoid, since it can create confusing
> divergence for anyone else who already pulled it."

### 6. Go Deeper

companion Software Systems Handbook's §46 (CI/CD Mechanics: pipelines, blue-green, canary,
rolling) chapter (branching strategies as part of the broader deployment pipeline).

---
