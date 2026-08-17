## §148. Model Providers: OpenAI, Anthropic, Bedrock, Azure OpenAI, and Gemini

### 1. The Vocabulary

- **Model provider API** — a hosted endpoint (OpenAI's API, Anthropic's API, Google's Gemini API)
  where you send a prompt and get a completion back, paying per token, with no infrastructure of
  your own to manage.
- **Bedrock / Azure OpenAI** — cloud-platform-native ways to access foundation models (including,
  in Bedrock's case, models from multiple providers) through the same IAM/networking/billing
  surface as the rest of that cloud's services, rather than a separate third-party account.
- **Self-hosting** — running an open-weight model yourself (on your own GPUs or a rented instance),
  trading the convenience and rapid iteration of a hosted API for cost control at scale and full
  data control.
- **Key dimensions across providers** — model ID/version, region availability, rate limits, cost
  per token (input vs output, often priced differently), latency, and context window size — the
  actual axes a real comparison is made on, not just "which one is smartest."

### 2. Where It Sits, and Why Teams Use It

Most AI features in production don't call a raw model directly from a phone or browser — they go
through your own backend, which calls a model provider. The provider choice is mostly about where
your team already has infrastructure and trust: a team fully on AWS often defaults to Bedrock for
the IAM/billing/networking integration, even if a different provider's model is technically
strongest for a given task; a team optimizing purely for one model's specific capability calls that
provider directly. Self-hosting is a much bigger commitment, usually only justified by very high
volume, strict data residency requirements, or a need for a fine-tuned model unavailable via API.

### 3. What Actually Breaks

- **Treating "which model" as the only decision** — rate limits, region availability, and
  input/output token pricing differences can matter as much as raw model quality for a real
  production feature's cost and reliability.
- **No fallback if the provider has an outage or rate-limits you** — a feature built assuming one
  provider is always available has no graceful degradation path when it isn't, which happens more
  often than teams expect during rapid usage growth.
- **Ignoring context window limits until they're hit in production** — a feature that works in
  testing with short inputs can break in production when a real user's input (a long document, a
  long conversation history) exceeds the model's context window.
- **Assuming self-hosting is cheaper without doing the actual math** — GPU infrastructure,
  operational overhead, and lower utilization than a shared hosted service can easily make
  self-hosting more expensive than API calls at moderate volume.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I evaluate a model provider on more than raw model quality — rate limits, region availability,
  and token pricing structure all affect whether a feature is actually reliable and affordable at
  real usage volume."
- "I know Bedrock and Azure OpenAI exist specifically to bring foundation models into a cloud
  platform's existing IAM and billing surface, as an alternative to a separate third-party API
  account."
- "I don't assume self-hosting is automatically cheaper — it's usually only worth it at high,
  sustained volume or for specific data-residency/fine-tuning requirements."

### 5. Interview-Ready Answer

> "For a backend AI feature, I'd call a model provider from my own server rather than exposing an
> API key to the client, and I'd choose the provider based on more than raw model capability —
> rate limits, region availability, and the input/output token pricing split all affect real cost
> and reliability at scale. If the team's already on AWS, Bedrock is often the practical default
> since it uses the same IAM and billing surface as everything else. I'd only consider self-hosting
> if volume, data residency, or fine-tuning needs actually justified the operational cost."

### 6. Go Deeper

companion AI Systems Handbook's §10 (Mental Model: Inference Engineering) chapter and companion
AI Systems Handbook's §27 (Inference Engineering Mechanics: vLLM, quantization) chapter for the
full cost/latency tradeoff analysis; this book's §83 (LLM basics) and §149 (Bedrock in practice)
for the adjacent model-mechanics and one-provider-in-depth coverage.

---
