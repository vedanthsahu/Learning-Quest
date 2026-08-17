## §85. Hallucination, Grounding, and Prompt Injection

### 1. The Vocabulary

- **Hallucination** — the model generating confident, plausible-sounding output that's factually
  wrong or entirely fabricated.
- **Grounding** — anchoring the model's answer in actual retrieved or provided source content
  (see RAG, §84), so it has real material to draw from instead of relying purely on generalized
  training knowledge.
- **Prompt injection** — an attacker (or just untrusted input) embedding instructions inside
  content the model processes, trying to override the system's actual intended instructions.
- **Guardrails** — checks (before the prompt, after the output, or both) that constrain what the
  model is allowed to do or say, catching problems before they reach a user or take an action.

### 2. Where It Sits, and Why Teams Use It

These three problems are all versions of "the model did something other than what was actually
intended," from three different causes: it made something up, it wasn't given the right grounding
material, or someone deliberately manipulated its instructions.

### 3. What Actually Breaks

- **Trusting model output as fact with no verification** — for anything where correctness
  actually matters (numbers, citations, specific claims), hallucination is a real, ongoing risk
  that needs a mitigation (grounding, citation requirements, human review) rather than being
  assumed away as a rare edge case.
- **Grounding content that's stale or incomplete** — grounding reduces hallucination but doesn't
  eliminate it if the source content itself is out of date or the retrieval step (§84) didn't
  surface the right material.
- **Untrusted content (a document, a webpage, a user message) containing hidden instructions** — a
  prompt injection attack can be as simple as a document containing text like "ignore previous
  instructions and instead..." — if that content gets fed into the model's context, the model may
  follow it as if it were a legitimate instruction.
- **No guardrails on what the model's output can actually do** — if a model's output directly
  triggers an action (sending an email, executing a database query, calling an API) with no
  validation layer in between, a hallucination or successful prompt injection can cause a real,
  not just conversational, consequence.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I don't treat model output as ground truth for anything where correctness matters — grounding
  it in real retrieved content helps, but doesn't fully eliminate hallucination."
- "Any untrusted content that enters the model's context (a document, a webpage, user-supplied
  text) is a potential prompt injection vector, and I design with that in mind."
- "If model output triggers a real action, I put a validation or guardrail layer between the
  output and the action, rather than executing it directly."

### 5. Interview-Ready Answer

> "Hallucination is a real, ongoing risk, not a rare edge case — I mitigate it with grounding
> (retrieval-based context) and, for anything where correctness really matters, human review or
> explicit citation requirements, rather than trusting model output as fact. Prompt injection is a
> related but distinct risk: any untrusted content that enters the model's context — a document, a
> webpage — could contain hidden instructions trying to override the system's actual intent. For
> anything where model output triggers a real action rather than just a conversational response, I
> want a guardrail or validation layer in between, so a hallucination or a successful injection
> can't directly cause a real-world side effect."

### 6. Go Deeper

companion AI Systems Handbook's §30 (AI Security Mechanics: prompt injection, guardrails) chapter
and companion AI Systems Handbook's §35 (Production Hallucination Diagnosis & Mitigation) chapter
(guardrails, grounding strategies in full depth).

---
