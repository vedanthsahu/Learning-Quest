# ADR-010 — External Model Provider Strategy

## Status
Direction selected for the 2026-10-01 build plan: installed Ollama models plus free OpenRouter inference. Adapter implementation and model qualification remain work to do. See [25-build-blueprint](../25-build-blueprint.md).

## Decision
Use OpenRouter as the first external adapter because the repository already has its configuration and an adapter stub. Select a specific verified free model in configuration; do not hardcode a claim about the best model or guaranteed quota. Reuse existing Ollama Llama models for local inference. Both can diagnose if evaluation supports them; provider location does not establish model quality.

The user mentioned AgentNow. Its exact model API, URL, authentication, and free access remain unverified. Earlier drafts named AgentRouter; this does not establish that they are the same product. Keep the second provider optional until identified and tested. This does not block the initial pair.

## Contract and failure policy
Normalize validated output and metadata behind the gateway; detect capabilities rather than assuming every model supports native tools, structured output, or streaming. Begin with local-only and external-free modes for comparison, then rule-based adaptive routing.

Allowlist free model IDs and keep paid routes disabled. Availability changes produce an unavailable state, not unrestricted automatic model selection or paid fallback. Use a total deadline, bounded input/output, bounded queue, and at most two invocations per investigation initially, including retries/repair. An allowed alternative may run only within that budget; exhausted attempts return collected evidence for human investigation. Local-only mode never sends evidence externally.

Keep API keys server-side. Minimize/redact externally sent evidence and review provider data policies. Use synthetic data for this demonstration. Store model identity, routing reason, latency, known usage, and failures without logging secrets.

## Options and consequences
- Ollama only: supports private/local work, but quality and CPU latency need measurement.
- Ollama plus one free external provider: selected; permits comparison with limited adapter complexity.
- Multiple external providers immediately: defer until availability measurements justify another adapter.
- Paid provider or Bedrock by default: outside the initial plan; requires an explicit budget decision and application spend/call limits.

Free access is not an availability guarantee. Unit/contract tests use fixtures; live verification is separately bounded. Benchmark outages and invalid results honestly.

## Sources and reconsideration
Checked 2026-10-01: OpenRouter's [free variants](https://openrouter.ai/docs/guides/routing/model-variants/free), [limits](https://openrouter.ai/docs/api_reference/limits), and [privacy policy](https://openrouter.ai/privacy/). Consult current account/model information when implementing. Reconsider the provider/model when measured quality, latency, availability, or policy prevents a useful demo; do not automatically enable spending.
