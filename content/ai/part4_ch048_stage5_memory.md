## 48. Nova Stage 5: Memory (Short/Long-Term, Semantic/Episodic)

### 48.1 What Broke

Stage 2's conversation history (§45) only persists within a single conversation session — once a user starts a new session, Nova has no memory of anything from prior sessions at all. Users expect Nova to remember stated preferences ("I prefer concise answers") and past interactions ("we discussed this last week") across sessions, not just within one.

### 48.2 Why

§25.5 established that long-term memory, unlike short-term context-window memory, must be architected as a persistent retrieval system — there is no mechanism by which a model "remembers" anything beyond what's explicitly included in its current request's context window (§15.5), meaning cross-session memory requires the same retrieval infrastructure Stage 4's RAG already introduced, applied to a different content source.

### 48.3 Candidates and Their Costs

**Option A — store and retrieve full past conversation transcripts:** Simple to implement (reuse Stage 4's vector database, §22) but retrieves entire past conversations rather than the specific relevant facts, consuming disproportionate context-window budget (§15.5) for often-marginal relevance. **Option B — extract and store distinct semantic facts (preferences, stated attributes) separately from episodic events (specific past interactions), each with tailored retrieval strategies:** More engineering effort (an extraction step distilling raw conversations into structured memory items) but produces far more precise, context-efficient retrieval matching §25.5's semantic/episodic distinction.

### 48.4 Chosen Solution

Option B: a background process (running after each conversation ends, not synchronously) extracts semantic facts (stated preferences, user attributes) and episodic summaries (what was discussed, when) into a separate long-term-memory vector store, distinct from the document corpus store from Stage 4 (§47.4) — using metadata (§13.4, §22.4) to keep each user's memory scoped strictly to that user, directly reusing the multi-tenant filtering discipline Stage 4 already required for document access control.

### 48.5 What It Enabled

Nova now provides continuity across sessions — remembering preferences and past context without requiring users to repeat themselves — while keeping memory retrieval precise and context-efficient by storing distilled facts rather than raw transcripts, directly avoiding Option A's context-budget cost.

### 48.6 The New Tradeoff This Introduced

Long-term memory retrieval is now a *second* retrieval system alongside Stage 4's document RAG, running for every request and consuming its own share of context-window budget and its own retrieval-quality risk surface (§34's diagnostics now apply to two independent retrieval systems, not one) — and the background extraction process itself introduces a new failure mode (extracted memory being stale, incorrect, or contradictory to more recent statements) that must be evaluated and monitored (§29, §39) as its own category, distinct from document-RAG faithfulness.

### 48.7 Engineering Intuition

> **Why extract distilled facts rather than just retrieving raw past conversations?** Raw transcripts contain far more content than is usually relevant to a specific new query, wasting context-window budget on low-relevance content (§15.5) — distillation trades one-time extraction cost for much better ongoing retrieval efficiency.

> **Why run extraction as a background process rather than synchronously during the conversation?** Extraction requires reading and summarizing content the user has already finished discussing — doing this synchronously would add latency to the user's active conversation for no benefit they experience in that moment; background processing defers this cost to when it doesn't affect perceived responsiveness (§19.6).

### 48.8 Decision Tree: Designing Nova's Memory System

```
Does the information need to influence future, DIFFERENT
conversations (not just the current one)?
  NO  -> This belongs in Stage 2's conversation history (§45), not
         long-term memory.
  YES -> Is it a stable FACT/preference (semantic) or a specific
         PAST EVENT (episodic)?
    SEMANTIC -> Store as a distinct, retrievable fact, filterable
                by topic similarity.
    EPISODIC -> Store as a distilled summary, filterable by both
                similarity AND time/session (§25.5).
```

### 48.9 Python Snippet: Background Memory Extraction After a Conversation Ends

```python
# Nova Stage 5: distills a finished conversation into semantic
# facts and an episodic summary, stored separately (§48.4).

def extract_memory(llm_client, conversation_transcript, user_id):
    extraction_prompt = f"""From this conversation, extract:
1. SEMANTIC facts: stable user preferences/attributes stated.
2. EPISODIC summary: a one-sentence summary of what was discussed.

Conversation:
{conversation_transcript}

Respond as JSON: {{"semantic_facts": [...], "episodic_summary": "..."}}"""

    result = llm_client.chat.completions.create(
        model="gpt-4o-mini",  # cheap model sufficient for extraction
        messages=[{"role": "user", "content": extraction_prompt}],
        response_format={"type": "json_object"},
    )
    import json
    extracted = json.loads(result.choices[0].message.content)

    for fact in extracted["semantic_facts"]:
        store_memory(user_id, fact, memory_type="semantic")
    store_memory(user_id, extracted["episodic_summary"],
                 memory_type="episodic", timestamp=now())
```

### 48.10 Further Reading

- §25.5 (Memory Types) — the direct conceptual foundation of this stage.

---
