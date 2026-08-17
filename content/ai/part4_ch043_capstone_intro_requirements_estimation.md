## 43. Capstone Intro: Requirements & Estimation for AI Systems — Introducing Nova

### 43.1 The Problem: Every Preceding Chapter's Mechanism, Assembled Into One Evolving System

Parts I-III developed each AI engineering concept largely in isolation — a chapter on retrieval, a separate chapter on evaluation, a separate chapter on agent reliability. Real products don't experience these as separate concerns: adding memory affects context-window budget (§15.5), which affects cost (§33), which affects model-routing decisions (§27.5), which affects evaluation design (§39). This capstone builds **Nova**, one AI assistant platform, evolved stage by stage exactly as a real product would be, so that every architectural decision is made under the accumulated weight of every earlier decision — directly mirroring the companion Software Systems Handbook's own continuous-capstone structure (companion Part IV), now specifically for an AI-native product.

### 43.2 Nova: The Product Being Built

Nova is a general-purpose AI assistant platform — conceptually positioned between a conversational assistant (ChatGPT/Claude-like), a tool-using agent (Cursor/Copilot-like), and an enterprise knowledge assistant (NotebookLM-like) — chosen deliberately broad so that every domain covered in Parts I-III (RAG, agents, fine-tuning, multi-tenancy, global scale) has a natural place to enter the capstone's evolution. Each stage (§44-55) adds exactly one major capability, in the order a real product team would realistically prioritize it, and each stage's chapter documents what specifically broke under the *previous* stage's architecture, forcing the current stage's change.

### 43.3 Requirements: What Nova Must Ultimately Support

By the final stage (§55), Nova must support: multi-turn conversation with reliable long-session memory (§48); grounded, cited RAG over a large, multi-tenant document corpus (§47); tool use and multi-step agentic task completion (§49-51); continuous evaluation and safety guardrails as first-class, non-optional infrastructure (§52-53); multi-tenant enterprise deployment with cost controls and role-based access (§54); and global-scale deployment across multiple regions with GPU fleet management (§55). Stating this full end-state up front — while building toward it incrementally — mirrors real product planning: teams rarely build the final architecture on day one, but the mature system's requirements shape early architectural choices in ways worth naming explicitly before the first line of Nova exists.

### 43.4 Estimation: Why AI Product Estimation Differs from the Companion Handbook's Approach

The companion handbook's capstone estimation exercises (companion §5's requirements-and-estimation chapter) focus on request volume, data size, and read/write ratios. Nova's estimation must additionally account for token-based cost and latency (§15) from the very first stage: even a simple chatbot's estimation requires projecting tokens-per-conversation, not just requests-per-second, since — as §15.9 established — cost and capacity planning for an AI product is fundamentally token-denominated, not request-denominated, from day one. This distinction is why AI product estimation is introduced as its own capstone chapter here rather than assumed to follow directly from the companion handbook's general estimation framework.

### 43.5 The Five-Question Framework Applied to Every Stage

Every stage chapter (§44-55) that follows answers exactly five questions, in order: **What broke?** (the specific limitation of the previous stage's architecture that motivates this stage); **Why?** (the underlying mechanism, per Parts I-III, causing that limitation); **Candidates and their costs?** (the realistic alternative solutions considered, each evaluated against the mechanisms from Parts I-III); **Chosen solution and why?** (the decision, justified against the specific candidates, not against a hypothetical ideal); **What did it enable, and what new tradeoff did it introduce?** (every fix creates a new constraint the *next* stage must contend with — directly the mechanism by which this capstone's stages connect into one coherent evolution rather than reading as unrelated case studies).

### 43.6 Engineering Intuition

> **Why build one evolving system rather than twelve independent case studies?** Because real architectural decisions are rarely made in isolation — the memory system built in §48 directly constrains the tool-calling design in §49 (shared context-window budget, §15.5), and that connection is the actual engineering lesson, invisible if each stage were presented as a standalone example.

> **Why does Nova's requirements list (§43.3) get stated before any code or architecture exists?** Stating the mature end-state's requirements up front lets each early stage's chapter explicitly note which future requirement it is (or isn't yet) accounting for — without this, a reader can't distinguish "this stage's design is simple because that's all that's needed yet" from "this stage's design has a gap that will need revisiting."

> **What would over-engineering look like here?** Designing Nova's Stage 1 chatbot (§44) with multi-tenant RBAC and global deployment considerations already built in — exactly the premature-architecture mistake real product teams make when they try to build the mature system's complexity before any of its actual requirements (traffic, data volume, team scale) exist yet.

### 43.7 Decision Tree: How to Read This Capstone

```
Are you building a new AI product from scratch right now?
  YES -> Read stages in order (§44-55) -- each stage's "what
         broke" is the realistic trigger for the next stage's
         investment; don't skip ahead to enterprise/global
         concerns (§54-55) before earlier-stage fundamentals
         (§44-47) are solid.
Are you diagnosing a SPECIFIC production issue in an existing
AI product?
  -> Go directly to Part III (§32-42)'s diagnostic chapters
     instead -- this capstone is a worked example of BUILDING,
     not a diagnostic reference (though each stage cross-
     references the relevant Part III diagnostic chapter for its
     own new failure surface).
Are you trying to understand ONE specific capability (e.g., just
memory, or just guardrails) in isolation?
  -> Read that capability's Part I/II/III chapters directly
     (§6/§23 for RAG, §25 for agents, etc.) -- the capstone stage
     chapter assumes that background and focuses on INTEGRATION
     tradeoffs, not first introducing the concept.
```

### 43.8 Python Snippet: A Token-Based Capacity Estimate for Nova's Launch

```python
# Demonstrates §43.4: AI product estimation is TOKEN-denominated
# from day one, not just request-denominated.

def estimate_nova_launch_capacity(daily_active_users,
                                    avg_conversations_per_user=2,
                                    avg_turns_per_conversation=6,
                                    avg_tokens_per_turn=300,
                                    cost_per_1k_tokens=0.01):
    total_conversations = daily_active_users * avg_conversations_per_user
    total_turns = total_conversations * avg_turns_per_conversation
    total_tokens = total_turns * avg_tokens_per_turn  # input+output combined

    daily_cost = (total_tokens / 1000) * cost_per_1k_tokens

    print(f"Daily conversations: {total_conversations:,}")
    print(f"Daily tokens (est.): {total_tokens:,}")
    print(f"Daily cost (est.): ${daily_cost:,.2f}")
    return daily_cost

estimate_nova_launch_capacity(daily_active_users=5000)
# This is Nova's Stage 1 (§44) estimate -- every later stage
# (RAG's retrieved context, memory's history, agent's multi-step
# tool calls) will ADD to avg_tokens_per_turn, directly motivating
# the cost/context discipline introduced starting in §45.
```

### 43.9 Further Reading

- The companion handbook's Part IV (Continuous Capstone) — the general capstone structure and estimation discipline this chapter adapts for an AI-native product.
- §15 (Token Economics Deep Dive) — the foundational chain underlying every cost/capacity estimate made throughout this capstone.

---
