## §152. AI Guardrails and Prompt Injection in Product Terms

### 1. The Vocabulary

- **Input validation (for AI features)** — checking and constraining what a user can put into a
  prompt, including detecting attempts to override system instructions.
- **Output validation** — checking what the model produces before acting on it or showing it to a
  user, especially before feeding it into anything else (a database query, a tool call, another
  prompt).
- **Tool permissioning** — an agent or tool-calling system should only be able to invoke the
  specific tools/actions it's been explicitly granted, scoped as tightly as any other credential
  (§141's least-privilege idea, applied to AI tool access).
- **Data boundary** — the deliberate line between what an AI feature can see (which documents,
  which user's data) and what it can't — the same access-control discipline as any other feature,
  not a separate, looser standard because "it's AI."

### 2. Where It Sits, and Why Teams Use It

"How do you secure an AI chatbot?" is a question worth having a real, structured answer to,
because the honest answer is that securing an AI feature uses mostly ordinary security discipline
— input validation, output validation, least-privilege tool access, data-boundary enforcement —
applied to a system whose behavior is harder to fully predict than typical deterministic code.
Prompt injection specifically (§85) is the AI-specific new risk: a user (or content the model
reads, like a retrieved document or a webpage) trying to override the system's actual instructions
through crafted input.

### 3. What Actually Breaks

- **No distinction between trusted instructions and untrusted content** — if retrieved documents or
  user messages are treated with the same trust as system instructions, injected text inside a
  document can override the intended behavior — the core prompt-injection risk.
- **An agent with unscoped tool access** — an agent that can call any internal API "to be useful"
  rather than only the specific, reviewed actions it needs is a single compromised prompt away from
  taking any of those actions.
- **Model output fed directly into a sensitive action with no validation** — using an AI-generated
  SQL query, shell command, or API call directly without validation or a human-in-the-loop step for
  higher-risk actions is a direct path from a manipulated prompt to real damage.
- **No monitoring for unusual patterns** — a spike in a specific kind of query, or unusual tool-call
  patterns, is often the first visible sign of an attempted prompt injection or abuse, and it's
  invisible without monitoring built for that specific feature (§153).

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Securing an AI feature is mostly ordinary security discipline — input/output validation,
  least-privilege access — applied to a system that's harder to fully predict."
- "I keep untrusted content, including retrieved documents, structurally separate from trusted
  system instructions, since that separation is the main defense against prompt injection."
- "I scope any tool-calling capability to the minimum needed, and I put a human-in-the-loop step
  in front of higher-risk actions rather than letting an agent act autonomously on everything."

### 5. Interview-Ready Answer

> "If asked how I'd secure an AI chatbot, my answer is: mostly the same discipline as any other
> feature, applied carefully. Input validation and rate limiting at the API boundary, output
> validation before anything the model produces gets acted on or shown, and least-privilege scoping
> for any tool the model can call — an agent shouldn't have broader access than the specific,
> reviewed actions it needs. The AI-specific addition is keeping untrusted content, including
> anything retrieved or pasted in by a user, structurally separate from the system's actual
> instructions, since blending them is what makes prompt injection possible."

### 6. Go Deeper

companion AI Systems Handbook's §30 (AI Security Mechanics: prompt injection, guardrails) chapter
for the full threat-model treatment; this book's §61 (SQL injection/XSS/SSRF) for the classical-
security parallel, and §85 (hallucination/grounding/prompt injection) and §86 (tool calling/
agents/human-in-the-loop) for the adjacent AI-specific mechanics.

---
