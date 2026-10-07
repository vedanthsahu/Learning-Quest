## 14. Production Architecture, Cost and Performance

You know most of this [A]. Here's the Claude-shaped version.

### 14.1 Reference architecture [D]

```
client ──► API gateway (authN, per-user rate limit)
              │
              ▼
        app service (stateless) ──► session store (Redis/Postgres): history, task state
              │                 ──► retrieval (vector DB) for context
              │
              ├─ sync path:  stream to client (SSE/WebSocket)
              └─ async path: queue ──► workers ──► Claude API / Batch API ──► results store
              │
              ▼
   Claude API client: timeouts, retries w/ backoff+jitter, circuit breaker, fallbacks
              │
   observability: logs, metrics (tokens, cost, latency, stop_reason, cache hit), traces
```

- **Stateless API → you store state.** Persist conversation history and agent state keyed by session; resend what's needed.
- **Streaming** for interactive UX; **queues and async workers** for long jobs and agent runs; **Batch API** for bulk offline work (about 50% cheaper, completes within 24 hours, results unordered and keyed by `custom_id`).
- **Timeouts:** long generations can take minutes. Set generous timeouts or stream; SDK timeouts are retried too, so wall-clock time can multiply.
- **Rate limits:** your own per-user limits upstream; respect `429` plus `retry-after`; smooth bursts with queues.
- **Circuit breakers and fallbacks:** on sustained 5xx/529, degrade gracefully (cached answer, smaller model, "try later"). **(version-dependent)** Newer models offer server-side fallbacks on refusals.
- **SLA thinking:** budget p95 latency including retries, thinking time and tool calls.

### 14.2 Observability [D]

Track per route: requests, errors by type, `stop_reason` mix (watch `max_tokens` and `refusal`), input, output, cache-read and cache-write tokens, cost per request **and per completed task**, latency (TTFT and total), tool-call counts and failures, and eval-quality samples. Use trace IDs across agent steps. Alert on drift.

### 14.3 Token economics [B]

- **Cost = input × in-price + output × out-price**, where cached reads cost about 0.1× and cache writes 1.25× (5 min) or 2× (1 h).
- Output is roughly **5×** the input price on current models, so control verbosity.
- Thinking tokens bill as output.
- Agents re-send growing context each turn, so cost grows superlinearly without caching and compaction.

### 14.4 Optimization playbook (in order) [D]

1. **Free wins:** prompt caching on stable prefixes; drop unused tools and boilerplate; trim retrieved context; concise output instructions; structured outputs instead of prose.
2. **Batch** non-urgent work (50% off).
3. **Effort:** lower it where evals show no quality loss.
4. **Model choice:** route simple traffic to smaller models. Measure cost per completed task, and remember caches are per model.
5. **Latency:** streaming, caching, parallel tool calls, lower effort, smaller model, shorter outputs.
6. **Throughput:** queue, concurrency control within rate limits, Batch API.

### Common Exam Traps

- Streaming improves *perceived* latency (TTFT); it doesn't reduce tokens or cost.
- The Batch API isn't for real-time use. It's cheaper because it's asynchronous.
- Caching reduces input cost and latency, not output cost.
- A cheaper model that needs retries or more turns can cost more per task.
- Retries without backoff amplify 429/529 storms.
