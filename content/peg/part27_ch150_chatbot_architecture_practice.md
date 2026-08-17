## §150. Chatbot Architecture in Practice

### 1. The Vocabulary

- **The basic flow** — User → your API → prompt/context builder → model provider → response
  (optionally streamed back) → User — the shape underneath almost every production AI chat feature,
  regardless of provider.
- **Conversation memory** — the accumulated message history sent back to the model on each turn,
  since the model itself is stateless between calls; memory is something *your* backend manages,
  not something the model inherently has.
- **Context window budget** — conversation memory, retrieved documents (§151), and system
  instructions all compete for the same fixed context window; long conversations eventually need
  to be summarized or truncated to fit.
- **Streaming** — sending the model's response back to the user token-by-token as it's generated,
  rather than waiting for the full response — the standard UX pattern for reducing perceived
  latency on longer generations.

### 2. Where It Sits, and Why Teams Use It

This chapter is the architectural skeleton behind "I used an LLM to build a chatbot" — the part
that's genuinely engineering, not just a model API call. Your backend owns auth (who's allowed to
chat and about what), rate limiting (protecting cost and the provider's own limits), conversation
memory management, prompt construction (system instructions plus history plus any retrieved
context), the actual model call, and logging — the model call itself is often the smallest piece of
code in the whole feature.

### 3. What Actually Breaks

- **No rate limiting on the chat endpoint** — an unprotected chat endpoint can be hit hard enough
  by a single user (accidentally or deliberately) to produce a very large, very fast provider bill
  — this is a real, common cost-control failure, not a theoretical one.
- **Unbounded conversation history sent every turn** — a long-running conversation's history can
  grow past the context window, or grow expensive token-cost-wise well before that, without an
  explicit summarization or truncation strategy.
- **No distinction between system instructions and user input in the prompt** — blending
  instructions and user-provided text without clear structure makes prompt injection (§85) easier
  and makes the assistant's behavior harder to control reliably.
- **Treating the model call as the only latency source** — retrieval (if using RAG), auth checks,
  and logging all add latency; profiling only the model call misses where a slow chat response is
  actually coming from.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "The model call itself is often the smallest part of a chatbot feature — auth, rate limiting,
  conversation memory, and prompt construction are where most of the real engineering is."
- "I manage conversation memory explicitly and have a truncation or summarization plan for long
  conversations, since the model itself has no memory between calls."
- "I rate-limit chat endpoints specifically because unprotected LLM endpoints are a direct,
  fast-moving cost risk, not just an abuse-prevention concern."

### 5. Interview-Ready Answer

> "A chatbot feature's architecture is: the request goes through my backend, which handles auth and
> rate limiting first, then builds the prompt — system instructions, managed conversation history,
> and any retrieved context — before calling the model provider, and finally logs the interaction
> for cost and quality tracking. I keep system instructions structurally separate from user input
> to reduce prompt injection risk, and I manage conversation memory explicitly with a truncation
> strategy, since the model has no memory of its own between calls and unbounded history is both a
> context-window and a cost problem."

### 6. Go Deeper

companion AI Systems Handbook's §44 (Stage 1: Simple Chatbot), companion AI Systems Handbook's
§45 (Stage 2: Conversation History), and companion AI Systems Handbook's §46 (Stage 3: Streaming
Responses) chapters for the full worked build-up of exactly this architecture; this book's §85
(prompt injection) and §151 (RAG flow) for the adjacent security and retrieval concerns.

---
