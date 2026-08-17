## §87. Evaluating AI Features: Eval Sets, LLM-as-Judge, Cost & Latency

### 1. The Vocabulary

- **Eval set** — a curated set of representative inputs (and ideally expected/acceptable outputs)
  used to measure how well an AI feature performs, systematically rather than by spot-checking.
- **LLM-as-judge** — using a (often more capable) model to evaluate another model's output against
  criteria, when a simple exact-match check isn't possible for open-ended text.
- **Offline vs. online evaluation** — testing against a fixed eval set before shipping (offline)
  vs. monitoring real production behavior and outcomes after shipping (online) — both are needed,
  neither substitutes for the other.

### 2. Where It Sits, and Why Teams Use It

Traditional software testing assumes deterministic, exact-match correctness; AI features often
don't have a single "correct" output, which means evaluation needs its own discipline separate
from a standard test suite's pass/fail model.

### 3. What Actually Breaks

- **Shipping with no eval set at all** — relying purely on "it looked good when I tried it a few
  times" provides no systematic signal about how the feature performs across the actual range of
  real inputs it will see.
- **An eval set that doesn't reflect real usage** — a small, easy, hand-picked set of examples
  can show great results while missing the harder, messier cases real users actually produce.
- **No regression tracking across prompt/model changes** — a prompt tweak or a model version
  upgrade that isn't re-evaluated against the same eval set can silently regress quality in ways
  that only show up later in production, or never get noticed at all.
- **Treating LLM-as-judge as infallible** — the judging model can itself be wrong or biased in
  systematic ways; it's a useful, scalable evaluation signal, not an unquestionable ground truth.
- **Only measuring quality, ignoring cost and latency** — a feature that's marginally more
  accurate but dramatically more expensive or slower may not actually be the right tradeoff;
  evaluation should include all three dimensions together.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I build an eval set from realistic, representative inputs, not just easy hand-picked examples,
  and I re-run it whenever the prompt or model changes."
- "LLM-as-judge is a useful, scalable signal for open-ended output, but I don't treat it as
  infallible ground truth."
- "I evaluate quality, cost, and latency together, since a small quality gain isn't automatically
  worth a large cost or latency increase."

### 5. Interview-Ready Answer

> "AI features don't have the same deterministic pass/fail correctness traditional tests assume,
> so evaluation needs its own discipline: a representative eval set, re-run every time the prompt
> or model changes, so I catch regressions instead of just eyeballing a few examples. For
> open-ended output where exact-match isn't possible, LLM-as-judge is a useful scalable signal,
> though not infallible. And I always evaluate cost and latency alongside quality, since those
> tradeoffs matter just as much as raw accuracy for whether a change is actually worth shipping."

### 6. Go Deeper

companion AI Systems Handbook's §29 (AI Evaluation Mechanics: LLM-as-judge, RAGAS) chapter
(offline/online eval, eval set construction in full depth).

---
