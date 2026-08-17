## 62. Worked Interview Examples I: ChatGPT, Claude, Cursor, GitHub Copilot

### 62.1 How to Read These Worked Examples

Each example below applies §61's twelve-step framework, but compressed to what actually differentiates that product's architecture — the point is not to reproduce every step exhaustively (a real interview answer wouldn't either) but to show *which steps carry the most weight for this specific product* and why, directly building the pattern-recognition skill §61.2 argued memorization cannot substitute for.

### 62.2 Design ChatGPT (General Conversational Assistant)

**Hidden constraint (Step 2):** The product must handle an unbounded diversity of tasks with no fixed corpus — there is no single "the data" the way an enterprise assistant has, so architecture must default to the model's trained knowledge, with retrieval (§6, §23) as an *add-on* capability (web browsing, file upload) rather than the core mechanism. **Capacity/latency (Steps 3-4):** Extreme scale, broad latency tolerance for complex queries but strong expectation of fast streaming start (§19.6) for perceived responsiveness. **Architecture (Step 6):** Conversation memory (§45, §48) is central and load-bearing from the first interaction; model routing (§27.5, §59.6's pattern) across a tiered model family is necessary given the wide range of query complexity and cost sensitivity at this scale; RAG is conditional/tool-based (§23.6's Agentic RAG, invoked only when browsing or file-reading is explicitly needed) rather than always-on. **Guardrails/security (Steps 8-9):** Broad-scope content policy enforcement (§30.5) across an enormous diversity of possible misuse, not a narrow, product-specific risk set. **Key tradeoff (Step 12):** Generality is the core value proposition, but it means no single, sharply-focused evaluation golden dataset (§29.2) is sufficient — evaluation must span an unusually broad task distribution, a genuinely harder evaluation-engineering problem than a narrow enterprise product faces.

### 62.3 Design Claude (General Conversational Assistant, Alignment-Emphasized)

**Distinguishing constraint (Step 2):** Functionally similar scope to ChatGPT (§62.2), but if the interview specifically invokes Claude, the interviewer is very likely probing whether the candidate distinguishes training-time alignment (§26.5's RLHF/Constitutional AI) from application-time guardrails (§30.5) as complementary layers — §57.6's cross-referenced lesson. **Architecture emphasis (Step 6):** A strong answer explicitly separates "what the underlying model was trained to refuse" from "what this application additionally validates before/after the model call" — conflating the two is the most common weak point in an answer to this specific framing. **Key tradeoff (Step 12):** Heavier safety-training investment (§26.5) has real capability/latency/cost implications during training, distinct from the ongoing operational cost of application-layer guardrails (§30.5) — a candidate who can articulate that these are separate cost centers, not one, is demonstrating real understanding of §57.6's lesson.

### 62.4 Design Cursor (AI Coding Assistant, IDE-Integrated)

**Hidden constraint (Step 2):** Two functionally distinct interaction modes exist within one product — inline completion (extremely latency-sensitive, §59.4) and agentic chat/edit (latency-tolerant but correctness-critical, §59.5) — an answer that proposes one uniform architecture for both has missed the product's defining engineering characteristic. **Architecture (Step 6):** Codebase-aware retrieval (§59.3's structure-aware retrieval, distinct from prose chunking, §21.6) feeding the agentic mode; a smaller, faster model with minimal context for inline completion, directly an instance of §27.5's model routing applied *within a single product* rather than across products. **Guardrails (Step 8):** Tool abuse here means unauthorized or destructive file/terminal operations (§13.6, §30.6) — least-privilege tool scoping and an explicit diff-review checkpoint (§25.8's human-in-the-loop, confirmed as real practice in §59.5) are not optional. **Key tradeoff (Step 12):** Agentic autonomy (letting the model edit multiple files and run commands) directly trades against review-friction — too little autonomy makes the tool merely a fancier autocomplete; too much without review checkpoints risks the kind of unreviewed, potentially-destructive change §25.8 warns against generally.

### 62.5 Design GitHub Copilot (AI Coding Assistant, Ecosystem-Integrated)

**Distinguishing constraint (Step 2):** If the interview specifically invokes Copilot rather than a generic coding assistant, it's often probing scale and ecosystem-integration considerations — serving inline completion at massive scale across a huge, heterogeneous population of repositories and languages, which is a distinct capacity-planning problem (Step 3) from a single-organization internal tool. **Architecture emphasis (Step 6):** At this scale, the inline-completion path's latency and cost (§15.7, §27) dominate engineering effort disproportionately relative to the agentic-chat path, since completion requests vastly outnumber chat requests in a typical developer's session — a candidate should explicitly justify where the majority of engineering investment goes based on this volume asymmetry, not split attention evenly across both modes. **Key tradeoff (Step 12):** Broad language/framework coverage versus per-language completion quality — a generalist model serving every language reasonably well versus specialized routing (§27.5) per language/context, a real cost-versus-quality tradeoff at this scale that a single-organization internal tool (§62.4-style) rarely has to make.

### 62.6 The Pattern Across All Four Examples

Notice that all four examples reuse the same underlying mechanisms (model routing, §27.5; memory, §45/§48; tools/agents, §25; guardrails, §30) — what differs is *which* mechanism is load-bearing and *why*, derived from each product's specific hidden constraints and capacity profile. This is the pattern-recognition §61.2 argued for: an interviewer switching from "Design ChatGPT" to "Design Cursor" mid-interview is testing whether a candidate can re-derive the architecture from new constraints, not whether they have a second memorized script ready.

### 62.7 Engineering Intuition

> **What's the fastest way to tell these four products apart in an interview?** Ask "what's the corpus, and how fresh does it need to be?" — ChatGPT/Claude default to no fixed corpus (trained knowledge plus optional tools); Cursor/Copilot's corpus is the user's own codebase, requiring continuous re-indexing as code changes (§21, applied to a fast-changing corpus) — this single question reorients the entire architecture discussion correctly.

> **What would over-engineering a Cursor/Copilot answer look like?** Proposing the same heavyweight, multi-minute agentic research pattern (§58.4's deep-research style) for inline code completion — completely mismatched to that mode's latency requirement (§59.4), and a clear sign the candidate hasn't internalized Step 4's latency-budget discipline.

### 62.8 Further Reading

- §57 (Reverse Engineering Conversational AI), §59 (Reverse Engineering AI Coding Assistants) — the documented/inferred factual basis these worked examples build on.

---
