## §88. LLM Cost Control: Prompt Caching, Rate Limits, and Token Budgets

### 1. The Vocabulary

- **Prompt caching** — many LLM providers can cache and discount the cost of a repeated prefix
  (e.g. a long system prompt or reference document) across multiple requests, since reprocessing
  identical leading tokens is wasted work.
- **Rate limit (RPM/TPM)** — providers cap requests-per-minute and tokens-per-minute per account/
  API key; hitting either causes throttled or rejected requests, independent of any application
  bug.
- **Token budget** — a deliberate cap on how many tokens a given feature or user is allowed to
  consume, used to bound worst-case cost.
- **Cost per request/user** — tracking spend at a granular enough level to actually understand
  where cost is coming from, not just a total monthly bill.

### 2. Where It Sits, and Why Teams Use It

LLM costs scale directly with usage in a way that's easy to underestimate until a bill arrives —
this chapter is the direct, practical answer to "LLM cost doubled after a prompt change" (§108),
one of the most common AI-specific production surprises.

### 3. What Actually Breaks

- **Not using prompt caching for a large, repeated system prompt or reference document** — if the
  same long prefix is sent on every request without caching, that's full-price reprocessing of
  identical content every single time, when the provider's caching discount could reduce that
  cost substantially.
- **A prompt change that quietly increases token count** — adding more context, a longer system
  prompt, or verbose few-shot examples increases the cost of *every* request going forward; a
  seemingly small prompt edit can be the entire explanation for a cost doubling.
- **No token budget on a feature, letting a pathological input balloon cost** — a user-supplied
  document or a runaway agent loop (§86) with no cap on tokens processed can produce an
  unexpectedly enormous single-request cost.
- **Hitting a rate limit and treating it as an application bug** — a sudden wave of `429`s from
  the LLM provider is often simply a rate limit being hit under load, not a code defect — the fix
  is request queuing/backoff or a limit increase, not debugging application logic.
- **No per-request or per-user cost tracking** — without granular tracking, a cost spike shows up
  only as a mysterious total, with no way to identify which feature, prompt, or user is actually
  driving it.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I use prompt caching for any large, repeated prefix — a long system prompt or reference
  document — since reprocessing identical content on every request wastes both money and
  latency."
- "Any prompt change gets checked for its token-count impact, since that directly multiplies
  across every future request."
- "I set a token budget on anything that processes variable-length or user-supplied input, so a
  pathological case can't produce an unbounded cost."

### 5. Interview-Ready Answer

> "LLM cost scales directly with token usage, which makes it easy to underestimate until a bill
> arrives. The specific practices I rely on: prompt caching for any large, repeated prefix, since
> reprocessing the same content on every request is wasted cost; checking the token-count impact
> of any prompt change, since a longer system prompt multiplies across every future request; and a
> token budget on anything processing variable or user-supplied input, so one pathological case
> can't produce an unexpectedly enormous single-request cost. And I track cost at a granular
> enough level — per feature or per user — to actually explain a spike, not just see a mysterious
> total."

### 6. Go Deeper

companion AI Systems Handbook's §33 (Production Cost Engineering) chapter; this book's own §83
(LLM Basics) and §108 (AI mysteries, including "LLM cost doubled after a prompt change").

---
