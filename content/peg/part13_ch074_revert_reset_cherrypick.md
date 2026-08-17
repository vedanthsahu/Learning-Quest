## §74. Revert, Reset, and Cherry-Pick

### 1. The Vocabulary

- **Revert** — creates a *new* commit that undoes a previous commit's changes, preserving history
  (nothing is deleted or rewritten).
- **Reset** — moves the current branch pointer to a different commit, optionally discarding
  changes (`--hard`) — this rewrites what the branch points to, unlike revert.
- **Cherry-pick** — apply one specific commit from elsewhere onto the current branch, without
  bringing over anything else from that other branch.

### 2. Where It Sits, and Why Teams Use It

These are the three standard tools for "undo this" or "grab just this one change," each with a
different blast radius and safety profile — knowing which one to reach for, especially on shared
branches, matters a lot more than knowing the commands exist.

### 3. What Actually Breaks

- **`reset --hard` on a shared branch** — this rewrites what the branch points to and can
  permanently discard commits that other people are relying on being there; on a shared branch,
  revert is almost always the safer choice.
- **Confusing revert and reset** — reaching for `reset` to "undo a bad commit that's already been
  pushed and pulled by others" creates the same shared-history rewriting problem as an
  unannounced rebase; revert achieves the same practical undo without rewriting anything.
- **Cherry-picking without realizing the commit depends on other, un-cherry-picked context** — a
  commit that only makes sense combined with other commits (a shared helper function added
  earlier, for instance) can fail to apply cleanly, or apply "successfully" but not actually work
  correctly, when cherry-picked alone.
- **Using `reset --hard` locally without checking for uncommitted work first** — a hard reset
  discards uncommitted changes with no built-in undo; running it without checking `git status`
  first is a common way to lose real, unsaved work.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "On a shared branch, I revert rather than reset, because revert doesn't rewrite history other
  people might already have."
- "Reset is for local, not-yet-shared history where rewriting is safe."
- "Before cherry-picking a commit, I check whether it depends on other context that also needs to
  come along."

### 5. Interview-Ready Answer

> "The distinction that actually matters is whether history has already been shared. Revert
> creates a new commit undoing a previous one, safe on shared branches because nothing gets
> rewritten. Reset moves the branch pointer and can discard history, which is fine locally before
> anything's pushed, but risky and disruptive on a shared branch. Cherry-pick lets me grab one
> specific commit without the rest of its branch, with the caveat that I check it doesn't depend
> on other context that isn't coming along with it."

### 6. Go Deeper

This book's own §72 (Git Workflow Basics) and §73 (Merge vs Rebase vs Squash) cover the
surrounding workflow context.

---
