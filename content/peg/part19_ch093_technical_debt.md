## §93. Technical Debt: How to Identify, Name, and Negotiate It

### 1. The Vocabulary

- **Technical debt** — a deliberate or accidental shortcut in design/implementation that trades
  short-term speed for longer-term cost (harder maintenance, higher bug risk, slower future
  changes) — a real, describable tradeoff, not just "bad code."
- **Deliberate debt** — a shortcut taken knowingly, usually to hit a deadline, with the tradeoff
  understood at the time.
- **Accidental debt** — a shortcut that wasn't a deliberate choice — often just the result of
  learning more about the problem after the fact, or a codebase evolving past its original design.
- **Debt paydown** — the deliberate, planned work of addressing technical debt, ideally tracked
  and prioritized like any other work, not left as an implicit, undiscussed backlog.

### 2. Where It Sits, and Why Teams Use It

Nearly every real system carries some technical debt — the skill isn't avoiding it entirely
(often impossible under real deadlines), it's being able to name it explicitly, communicate its
cost, and make a deliberate decision about when to pay it down, rather than letting it
accumulate silently and invisibly.

### 3. What Actually Breaks

- **Technical debt treated as a personal failing rather than a describable tradeoff** — framing
  debt discussions around blame ("who wrote this mess") instead of tradeoffs ("this shortcut
  saved us two weeks then, and now costs us an extra day per change") makes the conversation
  unproductive and discourages honest disclosure of intentional shortcuts.
- **Debt that's never explicitly tracked or communicated** — a shortcut taken under deadline
  pressure that isn't documented anywhere means nobody besides the original author knows it
  exists, until it causes a problem for someone with no context on why it's there.
- **"We'll fix it later" with no actual mechanism for later** — without a tracked ticket, a
  planned time to revisit, or an explicit decision to accept the debt indefinitely, "later" often
  just means "never," quietly.
- **Paying down debt with no clear business justification** — a large, disruptive refactor
  undertaken purely because the code "feels messy," with no concrete connection to a real cost
  (velocity, bug rate, onboarding time) it's actually solving, is a hard sell and sometimes a
  genuinely unnecessary risk.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I can describe technical debt as a specific tradeoff — what it saved us, and what it's costing
  us now — rather than a vague complaint about code quality."
- "Any deliberate shortcut gets explicitly tracked, not silently absorbed into 'the way things
  are.'"
- "When I advocate for paying down debt, I connect it to a concrete cost — velocity, bug rate,
  onboarding time — not just 'this code is old/ugly.'"

### 5. Interview-Ready Answer

> "I think of technical debt as a real, nameable tradeoff, not just a vague sense that code is
> messy. When I take a shortcut under deadline pressure, I try to explicitly note it — what it
> saved us and what it'll cost later — rather than let it silently become 'just how the codebase
> is.' And when I'm advocating to pay debt down, I connect it to a concrete cost it's actually
> causing — slower changes, more bugs, harder onboarding — rather than aesthetics alone, since
> that's what makes the tradeoff decision legible to people who didn't write the original code."

### 6. Go Deeper

companion Software Systems Handbook's §102 (Engineering Decision Catalog: 10 worked decision
trees) chapter (tradeoff documentation patterns).

---
