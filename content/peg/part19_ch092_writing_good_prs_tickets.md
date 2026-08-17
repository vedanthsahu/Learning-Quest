## §92. Writing Good PRs, Tickets, and Standup Updates

### 1. The Vocabulary

- **PR description** — the summary accompanying a pull request explaining what changed and why —
  distinct from the diff itself, which shows *what* but not *why*.
- **Ticket** — a tracked unit of work (a bug, a feature, a task), whose quality determines how
  easily anyone (including future-you) can pick it up with full context.
- **Standup update** — a short, regular status communication, meant to surface blockers and
  progress, not a detailed narration of every action taken.

### 2. Where It Sits, and Why Teams Use It

Writing is a real engineering skill, not a separate "soft skill" bucket — a PR, a ticket, and a
standup update are all communication artifacts that directly affect how efficiently a team can
work together, review each other's work, and pick up context later.

### 3. What Actually Breaks

- **A PR description that just says "fixes bug" or restates the diff** — a reviewer (or a future
  engineer looking at `git blame`) gets no context on *why* the change was made this way, what
  alternatives were considered, or what to specifically pay attention to during review.
- **A ticket with no context or acceptance criteria** — "add caching to the API" with nothing
  else leaves the actual scope, expected behavior, and definition of done entirely to guesswork,
  producing wildly different implementations depending on who picks it up.
- **A standup update that's a detailed narration instead of a status** — going through every
  small step taken since yesterday, rather than surfacing what matters (progress, blockers,
  what's next), wastes everyone's time and buries the one thing that might actually need input
  from the team.
- **No mention of tradeoffs or alternatives considered** — a PR or ticket that only describes the
  chosen approach, with no note on what else was considered and why it wasn't chosen, loses
  valuable context that would help a reviewer evaluate the decision, or help someone revisit it
  later.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "A PR description explains why, not just what — the diff already shows what."
- "A ticket I write includes enough context and acceptance criteria that someone else could pick
  it up without needing to ask me clarifying questions first."
- "My standup updates focus on progress, blockers, and what's next — not a full narration of
  every step."

### 5. Interview-Ready Answer

> "I treat writing as part of the actual engineering work, not a separate soft skill. A PR
> description should explain why a change was made and what alternatives were considered, since
> the diff itself already shows what changed. A ticket should have enough context and acceptance
> criteria that someone else could pick it up cold. And a standup update should surface progress
> and blockers concisely, not narrate every step taken — the goal is giving the team what they
> actually need to help or plan around, not a detailed log."

### 6. Go Deeper

companion Software Systems Handbook's §102 (Engineering Decision Catalog: 10 worked decision
trees) chapter (ADR-style documentation, which follows the same "explain the why" discipline at a
larger scale).

---
