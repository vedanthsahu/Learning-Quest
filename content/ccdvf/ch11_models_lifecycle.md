## 11. Model Selection, Lifecycle and Migration

### 11.1 Positioning [B]

| Family | Position | Typical use |
|---|---|---|
| **Haiku** | Fastest, cheapest | High-volume classification, extraction, routing, simple subagents, real-time UX |
| **Sonnet** | Balanced speed, capability and cost | Most production apps, coding, agents at scale |
| **Opus** | Most capable of the three | Hard reasoning, long-horizon agentic work, complex coding |
| *(version-dependent)* a top tier above Opus (e.g. "Fable") | Highest capability and price | Most demanding work |

Pick the **smallest model that meets the quality bar on your eval**, then tune effort. Often the most capable model at *lower effort* beats a cheaper model at high effort per completed task. Measure.

Selection levers: capability vs cost, latency vs quality, context size, features (vision, thinking, tool use), and availability on your platform (Bedrock, Vertex, Foundry).

### 11.2 Model IDs and aliases [B][C]

- A **model ID** is the exact string in `model`. Older generations used **dated snapshot IDs**, such as `claude-sonnet-4-5-20250929`, plus an **alias**, such as `claude-sonnet-4-5`, that points to the latest snapshot of that model.
- **Snapshot = frozen behaviour.** An **alias may move** to a newer snapshot, so behaviour can change without a code change. Many current models ship with a single undated ID **(version-dependent)**.
- **Pinning** a specific snapshot gives reproducibility. Production should pin and upgrade deliberately; prototypes may use aliases.
- Use the **Models API** (`GET /v1/models`) to discover available models and capabilities. Don't hard-code assumptions.
- On cloud platforms IDs differ: Bedrock adds an `anthropic.` prefix; Vertex uses `@` before a date.

### 11.3 Lifecycle [B][C]

```
Active ──► Legacy ──► Deprecated (announced, retirement date set) ──► Retired (requests fail)
```

- **Deprecation** is advance notice that a model will be retired on a stated date. It still works until then.
- **Retired** models return errors. **Pinning doesn't protect you from retirement**; it only prevents silent *changes* before then.
- Anthropic publishes deprecation notices and recommended replacements. Track them; email notices go to the org.

### 11.4 Safe migration [D][C]

```
1. Inventory every place a model ID is used (config, not hard-coded)
2. Read the migration notes: breaking API changes (removed params, new defaults,
   thinking/effort semantics, tokenizer changes → token counts and costs shift)
3. Run your FROZEN regression/eval set on old vs new model
4. Re-tune prompts (newer models follow instructions more literally; drop
   shouting/over-prescription) and effort
5. Canary: a small % of traffic, compare quality, latency, cost, error and refusal rates
6. Roll out gradually; keep rollback = switch the config back to the old ID
7. Finish before the retirement date
```

Things that break on migration **(version-dependent examples)**: removed sampling parameters, removed assistant prefill, `budget_tokens` → adaptive thinking plus effort, changed default effort, a new tokenizer (more tokens for the same text means different cost and context use), and changed tool-choice support.

**Prompt compatibility:** prompts aren't guaranteed portable across models. Test them. A prompt tuned around one model's quirks can underperform on the next.

### 11.5 Optimization levers [B][D]

| Goal | Levers (roughly in order) |
|---|---|
| **Cost** | Prompt caching → trim input (retrieval, pruning) → limit output (concise format, structured output, `max_tokens`) → lower effort → smaller model → Batch API (50% off, async) |
| **Latency** | Streaming (time to first token) → caching (faster prefill) → lower effort or no thinking → smaller model → shorter outputs → parallel calls |
| **Output tokens** | Explicit length and format instructions, structured output, effort, stop sequences |

Output tokens cost several times more than input, so verbosity is usually the biggest lever after caching.

### Common Exam Traps

- **Pinning doesn't prevent deprecation or retirement.**
- An alias can change behaviour under you; a snapshot doesn't (until retired).
- "Just switch the model ID in production" without regression testing is the wrong answer.
- A new model may tokenize differently, so cost and context estimates change.
- The cheapest model isn't automatically cheapest per *completed task* (retries, more turns).
- Deprecated means it still works but is scheduled to end. Retired means it's gone.

### Check Yourself

1. Output style changed overnight; no code changed. What likely happened, and how do you prevent it?
2. A deprecation notice arrives for your pinned model. Plan?
3. A latency-critical intent router runs on the largest model. First change?
4. Cost doubled after migration despite identical traffic. Two possible causes?

**Answers**

1. You used an alias that moved to a new snapshot. Pin a snapshot ID and upgrade via regression tests.
2. Identify the replacement, run the frozen regression set, adjust prompts and parameters, canary, roll out, and keep rollback, all before the retirement date.
3. Use a smaller, faster model (Haiku) and/or lower effort, validated on the eval set.
4. Tokenizer change (more tokens per text), a different default effort or thinking behaviour (more output tokens), longer outputs, or lost cache hits (a cold cache on the new model).
