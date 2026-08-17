## 14. Mental Model: AI Operations

### 14.1 The Problem: Running an AI Product Is a Continuous, Not a One-Time, Activity

Everything covered so far in Part I describes building an AI system. **AI Operations** is the discipline of keeping it running well, indefinitely, after launch — directly the AI-specific instance of the companion handbook's observability, reliability, and incident-response disciplines (companion §16, §19, §24), applied to a system whose behavior is probabilistic, whose primary cost driver (tokens, §15) is unlike anything in ordinary software, and whose failure modes (§32-42) are frequently invisible to conventional monitoring entirely.

### 14.2 AI-Specific Observability: Tracing, Prompt Logging, and Token Analytics

Ordinary distributed tracing (companion §48.4) follows a request across services. **AI observability** extends this with AI-specific detail: **prompt logging** — capturing the exact, full prompt sent to a model (including retrieved context, §6) and the exact response received, since debugging an AI system's misbehavior almost always requires seeing precisely what the model actually saw, not just that a call was made. **Token analytics** — tracking token consumption (input and output separately, §15) per request, per feature, per user — the direct foundation of cost monitoring (§14.3) and a frequent early-warning signal for problems (a sudden increase in average tokens-per-request often signals a context-management bug, §45, before it ever shows up as a cost anomaly).

### 14.3 Cost Monitoring and GPU Utilization as First-Class Metrics

Directly extending the companion handbook's FinOps discipline (companion §68.5, §78), AI operations tracks cost per request, per feature, and per user as continuously-monitored metrics, specifically because token-based pricing (§15) makes cost variance across seemingly-similar requests far larger and less predictable than ordinary compute cost — a single unusually long conversation or an unexpectedly large retrieved context can cost dramatically more than a typical request, in a way ordinary API cost accounting rarely experiences. For self-hosted inference (§10-11), **GPU utilization** is tracked with the same urgency the companion handbook assigns to any expensive, supply-constrained resource (companion §77.2) — idle GPU capacity is a direct, continuous cost leak.

### 14.4 Latency Monitoring: Time-to-First-Token vs. Total Generation Time

AI-specific latency monitoring must track two genuinely distinct numbers, not one: **time-to-first-token** (how long before the user sees anything at all — directly relevant given §10.7's streaming discussion, and the metric that dominates *perceived* latency) and **total generation time** (how long until the complete response finishes — relevant for total resource consumption and for use cases where the complete answer, not just the start of one, is what matters). Monitoring only an average total-latency figure hides exactly the kind of tail-latency problem the companion handbook warned against generically (companion §50.3) — and AI systems are especially prone to a wide latency distribution, since response length itself varies enormously request to request in a way ordinary API response sizes typically don't.

### 14.5 Fallback Models, Caching, and Rate Limiting for AI Systems

**Fallback models** — automatically routing to a different (often smaller, faster, or differently-hosted) model when the primary model is unavailable or exceeding a latency threshold — directly the AI-specific instance of the companion handbook's circuit breaker pattern (companion §42.5), with the added nuance that a fallback model may produce meaningfully different quality output, meaning the fallback decision itself is a product-quality tradeoff, not merely an availability one. **Caching** for AI systems operates at multiple levels: ordinary response caching for identical or near-identical requests (companion §10, §39), and prompt caching specifically (§7.6, §24) for the shared-prefix cost optimization unique to LLM serving. **Rate limiting** (companion §60.2) applies directly, with AI-specific urgency given per-request cost variance (§14.3) — a single abusive or malfunctioning client can generate disproportionate cost far more easily with token-priced requests than with ordinary API calls.

### 14.6 Canary Releases and Shadow Deployments for Model and Prompt Changes

The companion handbook's deployment-risk-reduction patterns (companion §46.4, §101.2) apply directly to AI-specific changes: a **canary release** of a new prompt, model version, or RAG pipeline change routes a small fraction of real traffic to the new version, monitoring evaluation metrics (§12) and cost/latency before full rollout — critically, canary success criteria for AI changes must include quality/evaluation metrics, not just error rate and latency, since a "successful" (no errors, fast) AI change can still be a quality regression that ordinary deployment monitoring would miss entirely. **Shadow deployment** (companion §101.2) — running a new model or prompt version against real traffic in parallel, comparing its output to the current production version without ever showing shadow output to real users — is especially valuable for AI changes specifically because it allows direct, real-traffic evaluation-metric comparison (§12) before any user is ever exposed to a risk.

### 14.7 Incident Response for AI Systems: A Preview of Part III

Every operational concept in this chapter has a corresponding failure mode developed in full production depth in Part III (§32-42), using exactly the AI Failure Engineering framework introduced in this handbook's front matter (§0.4): Symptoms, Possible Causes, Metrics, Investigation, Root Cause, Mitigation, Tradeoffs, Prevention. This chapter's job was to establish *what* is monitored and operated; Part III's job is to teach *diagnosis* when any of it goes wrong in production.

### 14.8 Engineering Intuition

> **How do I know if my AI operations practice is adequate for production?** Ask whether you could currently answer, within minutes, "what exact prompt and context produced this specific bad response" for any real user complaint — if the honest answer is no, prompt logging (§14.2) is an immediate, high-priority gap.
>
> **What symptoms indicate a token-analytics gap?** Cost surprises discovered only on a monthly bill, rather than visible as a continuously-monitored, per-feature metric (§14.3) — directly the AI-specific instance of the companion handbook's cost-visibility warning (companion §78.6).
>
> **What would over-engineering look like here?** Building elaborate canary/shadow deployment infrastructure (§14.6) before basic prompt logging and evaluation (§12) exist to actually judge whether a canary is succeeding or failing on quality, not just on error rate.

### 14.9 Decision Tree: What AI Operations Investment Do I Need First?

```
Can you currently reconstruct the exact prompt/context/response
for any specific past request, for debugging?
  NO  -> Add prompt logging (§14.2) FIRST -- nothing else in
         this chapter is debuggable without it.
  YES -> Do you track cost and token consumption per feature/
         user continuously, not just as an aggregate monthly bill?
    NO  -> Add token analytics/cost monitoring (§14.3) next.
    YES -> Do you have a fallback model AND rate limiting in
           place for your primary model dependency?
      NO  -> Add these (§14.5) before scaling traffic further.
      YES -> You have the operational basics -- canary/shadow
             deployment practice (§14.6) is the natural next
             investment for de-risking future changes.
```

### 14.10 Python Snippet: Structured Prompt Logging

```python
# Demonstrates §14.2: logging enough structured detail to
# reconstruct and debug ANY past request after the fact.

import json
import time

def log_llm_call(logger, model, prompt, response, retrieved_context=None):
    record = {
        "timestamp": time.time(),
        "model": model,
        "prompt": prompt,
        "retrieved_context": retrieved_context,  # critical for RAG
                                                    # debugging, §34
        "response": response.choices[0].message.content,
        "prompt_tokens": response.usage.prompt_tokens,
        "completion_tokens": response.usage.completion_tokens,
    }
    logger.info(json.dumps(record))  # structured, queryable --
                                        # directly the companion
                                        # handbook's §48.5 principle,
                                        # applied to AI-specific fields
    return record
```

### 14.11 Further Reading

- LangSmith, Langfuse, and Weights & Biases Weave documentation — practical, widely-used reference implementations of the prompt-logging and evaluation-tracing patterns in §14.2 and §12.
- The companion handbook's §48 (Observability Mechanics) and §57 (Incident Response Deep Dive) — the general-systems foundation this entire chapter builds on directly.

---
