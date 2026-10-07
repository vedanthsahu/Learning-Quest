## 7. Prompt Caching

### 7.1 Why it exists [B]

The API is stateless, so long system prompts, tool definitions, documents and conversation history are **resent on every call**. Prompt caching lets Anthropic reuse the already-processed **prefix**, which cuts the cost of those tokens by about 90% and reduces latency (time to first token).

### 7.2 How it works: prefix matching [B][C]

The request is rendered in a fixed order:

```
tools  →  system  →  messages
└─────────── cached prefix ───────────┘ ← cache_control breakpoint
```

- You mark a **breakpoint** with `cache_control: {"type": "ephemeral"}` on a content block. Everything **up to and including** that block is the cacheable prefix.
- The cache key is the **exact bytes** of the prefix. Change one byte anywhere (a timestamp, a reordered tool, a different system line) and everything **after that point** misses.
- **Max 4 breakpoints** per request. Top-level automatic caching (`cache_control` on the request) places one for you and moves it forward as the conversation grows **(version-dependent)**.
- Each breakpoint looks back a limited number of blocks (20) for an earlier entry. Very long turns may need intermediate breakpoints.
- There's a **minimum cacheable length** per model (roughly 512–4096 tokens, model-dependent). Shorter prefixes **silently don't cache**: no error, just zero cache tokens.

```python
system=[
  {"type": "text", "text": BIG_STABLE_INSTRUCTIONS,
   "cache_control": {"type": "ephemeral"}}            # tools + system cached together
]
```

### 7.3 Reads, writes, lifetime, cost [B][C]

| Event | Usage field | Price vs base input |
|---|---|---|
| Cache **write** (first time) | `cache_creation_input_tokens` | **1.25×** (5-minute TTL) or **2×** (1-hour TTL) |
| Cache **read** (hit) | `cache_read_input_tokens` | **~0.1×** (lower on some newest models) |
| Uncached tail | `input_tokens` | 1× |

- **Lifetime (TTL):** 5 minutes by default; optionally 1 hour (`"ttl": "1h"`). **Each hit refreshes the timer** for free. Steady traffic keeps a 5-minute cache warm indefinitely; choose 1h only when gaps between requests are 5–60 minutes.
- Break-even: with the 5-minute TTL the second request already saves money.
- Output tokens are never cached; caching only affects input.
- Caches are scoped per organization **and model**. Switching models means a cold cache.

### 7.4 What can be cached [B]

Tool definitions, system blocks, and message content blocks (text, images, documents, tool_use and tool_result) can all sit in the cached prefix. Thinking blocks can't carry `cache_control` themselves but are cached as part of the prefix when they precede a breakpoint **(version-dependent detail)**.

### 7.5 Silent invalidators [C][D]

- `datetime.now()` or a request ID interpolated into the system prompt.
- Non-deterministic tool ordering or JSON key order.
- Adding or removing a tool mid-conversation (tools render first, so everything misses).
- Switching model.
- **(version-dependent)** Changing thinking settings, `tool_choice` or effort mid-conversation can invalidate the message-level cache.
- Editing or deleting earlier turns (pruning in the middle).

**Verify** with `usage.cache_read_input_tokens`. If it stays 0 across identical-prefix requests, diff the request payloads.

### 7.6 Placement patterns [B]

1. **Large shared instructions or tools:** breakpoint at the end of `system`.
2. **Multi-turn chat or agent loop:** breakpoint on the latest turn (or automatic caching). Each request reads the prior prefix and writes the new tail.
3. **Shared document, varying questions:** breakpoint at the end of the **shared** part, with the question after it. A breakpoint after the unique question would write a new entry every time and never read.

### 7.7 How it relates

- **Context engineering:** caching makes repeated tokens cheap; it doesn't shrink context. Compaction and pruning shrink it but also break the prefix.
- **Rate limits:** **(version-dependent)** cache reads are treated favourably by input-token rate limits on current models.
- **Batches:** caching works with batch requests too. The discounts combine, but hits are less predictable because batch requests run asynchronously.

### Common Exam Traps

- Caching is **prefix-based**. Volatile content must come *after* the breakpoint.
- The first request **costs more** (write premium). Savings start on reads.
- A prompt below the minimum length doesn't cache, and there's no error.
- The default TTL is 5 minutes; it refreshes on each read.
- Caching reduces cost and latency of input; it doesn't reduce output tokens or context size.
- A changed tool list invalidates everything because tools come first.
- Caching doesn't change model responses. It's the same output as uncached.

### Check Yourself

1. A RAG app puts `Today is {date} {time}` at the top of a 10K-token system prompt. Cache hit rate is 0. Fix?
2. Users ask different questions about the same 200-page manual. Where does the breakpoint go?
3. Traffic arrives every 20–40 minutes. Which TTL, and why?
4. Which usage fields prove the cache is working?
5. Does enabling caching make the first request cheaper?

**Answers**

1. Move the timestamp out of the prefix (into the user message after the breakpoint) or remove it. Any change in the prefix invalidates the cache.
2. After the manual (end of the shared part), before the per-user question.
3. 1-hour TTL. The 5-minute entry would expire between requests; the 1h write premium pays off with several reads.
4. `cache_read_input_tokens` > 0 on repeat requests (and `cache_creation_input_tokens` on the first).
5. No. The first request pays the write premium (1.25× or 2×). Later reads are about 0.1×.
