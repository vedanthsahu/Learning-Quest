## §153. AI Observability and Cost

### 1. The Vocabulary

- **Prompt/response logging** — recording what was sent to and received from the model, essential
  for debugging bad answers, but requiring deliberate care about what gets logged (see below).
- **Token usage tracking** — logging input and output token counts per call, since that's what
  directly drives cost and is usually billed at different rates for input versus output.
- **Retrieval hit quality (for RAG)** — tracking whether retrieval actually returned relevant
  chunks, separate from tracking whether the final answer was good — a bad answer with good
  retrieval points at the generation step; a bad answer with poor retrieval points upstream.
- **Eval failures** — tracking automated evaluation results (§87) over time in production, not
  just at development time, since real user inputs drift from whatever the original eval set
  covered.

### 2. Where It Sits, and Why Teams Use It

AI features need everything ordinary observability provides (§47) plus AI-specific dimensions:
token cost per request (which can vary enormously between requests, unlike a typical API call),
latency broken down by pipeline stage (retrieval vs generation vs post-processing), and quality
signals that a normal HTTP status code can't capture — a 200 response can still be a wrong or
harmful answer. Cost specifically deserves its own explicit tracking because a single feature's
per-request cost can vary by 10-100x depending on input length, retrieved context size, and output
length, in a way most traditional API endpoints don't.

### 3. What Actually Breaks

- **Logging raw prompts/responses containing PII or secrets** — a debugging log that includes a
  user's full message can capture personal information or, in worse cases, secrets a user pasted
  in, without deliberate redaction; treat AI logs with the same sensitivity as any other user-data
  log, not more casually because it's "just a prompt."
- **No per-feature or per-user cost breakdown** — a single "AI costs" line item with no
  breakdown makes it impossible to tell which feature or which usage pattern is actually driving
  cost, which matters directly once a bill spikes unexpectedly (the §108 incident).
- **No latency breakdown by stage** — treating "AI response was slow" as one undifferentiated
  number makes it impossible to tell whether retrieval, generation, or something else entirely
  (auth, database calls) is the actual bottleneck.
- **Evals run once at launch and never again** — production input drifts from what the original
  eval set covered; without ongoing production evaluation, quality regressions from a prompt
  change or a model version update can go unnoticed until users complain.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I track token usage and cost per request, broken down enough to know which feature or usage
  pattern is actually driving spend."
- "I break down latency by pipeline stage — retrieval versus generation versus everything else —
  rather than treating 'the AI feature is slow' as one number."
- "I'm deliberate about what gets logged from prompts and responses, since they can contain PII or
  secrets just like any other user input."

### 5. Interview-Ready Answer

> "For an AI feature, I track token usage and cost per request with enough granularity to know
> which feature or user pattern is actually driving spend, since cost can vary far more per-request
> than a typical API call. I break latency down by stage — retrieval, generation, everything else —
> so a slow response has an identifiable cause rather than one undifferentiated number. And I treat
> prompt/response logs with the same sensitivity as any other user-data log, since they can contain
> PII or pasted secrets, while still keeping enough logged to actually debug a bad answer when one
> comes in."

### 6. Go Deeper

companion AI Systems Handbook's §41 (Production AI Observability & Monitoring at Scale) chapter
and companion AI Systems Handbook's §33 (Production Cost Engineering) chapter for full dashboard
and alerting design; this book's §47-53 (logs/metrics/traces, SLIs/SLOs) and §87 (evaluating AI
features) for the general-observability and evaluation foundations this chapter builds on.

---
