## 30. AI Security Mechanics: Prompt Injection, Jailbreaks, Data Leakage, PII Protection, Guardrails, Input/Output Validation, Tool/Model Abuse, Secrets Handling, Policy Engines

### 30.1 The Problem: Turning §13's Security Mental Model into Concrete, Testable Defenses

§13 established the AI security threat landscape conceptually. This chapter develops the actual mechanics of detection and defense — how guardrails are technically implemented, how prompt injection is concretely tested for, and how policy engines are structured — the mechanical foundation underlying every production security operation in §40.

### 30.2 Prompt Injection Defense Mechanics: Layered, Not Singular

No single defense reliably eliminates prompt injection (§13.2), so production systems layer several: **delimiter-based structuring** clearly marks untrusted content boundaries within the prompt (e.g., wrapping retrieved documents or user input in explicit tags), making it at least somewhat harder for injected instructions to be mistaken for the system's own; **instructional reinforcement** repeats the system's core constraints near the untrusted content itself (not only at the very start of the prompt), since a model's adherence to instructions can weaken over a long context (a direct consequence of attention's behavior over long sequences, §17); a **dedicated classifier model** — separate from the primary model — scores incoming content for injection likelihood before it's ever included in the primary prompt, providing a defense layer that doesn't depend on the primary model's own (imperfect) resistance to injection at all; and **privilege separation** ensures that even a successful injection cannot cause serious harm, by constraining what the model is *capable* of doing regardless of what it's told to do (§30.7's least-privilege tool scoping) — the single most important defense precisely because it doesn't rely on injection detection succeeding at all.

### 30.3 Jailbreak Detection and Mitigation Mechanics

Distinct from injection defense (§30.2), jailbreak mitigation operates at two levels: the model provider's own training-time safety alignment (RLHF/Constitutional AI, §26.5 — outside an application engineer's direct control) and application-level output monitoring, which screens generated output *after* the fact for policy-violating content regardless of what prompt produced it — a necessary second layer specifically because provider-level alignment is an ongoing, imperfect arms race (§13.3), meaning an application cannot assume the underlying model will always refuse what it's supposed to refuse.

### 30.4 Data Leakage and PII Detection Mechanics

Concretely, PII detection (§13.4) is typically implemented via a combination of pattern matching (regular expressions for structured PII like phone numbers, emails, government ID formats) and a dedicated PII-detection model or service (for less structured PII like names or addresses embedded in free text, which pattern matching alone cannot reliably catch) — applied both to content entering a prompt (redacting or flagging before sending to a model, especially a third-party provider) and to content being logged (§14.2, §31), since logs are a frequently-overlooked secondary leakage surface distinct from the model interaction itself. Multi-tenant data leakage (§13.4's second concern) is prevented mechanically through metadata filtering enforced at the retrieval layer (§21, §22.12's filtered-query pattern) — critically, this filter must be enforced in the retrieval system itself, not merely instructed to the model via the prompt, since a prompt-level instruction ("only discuss this user's own data") is a request the model can fail to follow, while a retrieval-layer filter is a structural guarantee the model never even sees other tenants' data in the first place.

### 30.5 Guardrail Implementation Mechanics: Rule-Based, Classifier-Based, and Model-Based

Input and output guardrails (§13.5) are implemented through three complementary mechanisms with different accuracy/cost/latency tradeoffs: **rule-based** guardrails (regex/keyword matching, §13.10's minimal example) are fast and fully deterministic but limited to catching only patterns explicitly anticipated in advance; **classifier-based** guardrails (a small, dedicated model trained specifically to detect a category like toxicity, injection attempts, or PII) generalize better to unanticipated phrasings at moderate latency/compute cost; **model-based (LLM) guardrails** (a general-purpose model call judging content against a policy description, similar in mechanism to LLM-as-judge, §29.3) are the most flexible and adaptable to novel or nuanced policy violations but carry the highest latency and cost, and — critically — their own non-trivial error rate, meaning a model-based guardrail should itself be evaluated (§29) rather than trusted as an infallible safety net, exactly as §13.5 warned conceptually.

### 30.6 Tool and Model Abuse Mitigation Mechanics

Tool abuse mitigation (§13.6) is implemented primarily through **schema-level constraints** on tool definitions themselves — restricting a tool's parameter space so that dangerous argument combinations are structurally impossible to request in the first place (e.g., a refund tool whose schema caps the maximum refund amount, rather than relying on the model's judgment never to request an excessive one) — directly the AI-specific instance of the companion handbook's defense-in-depth principle (companion §49.8), pushing safety enforcement into the tool's own implementation rather than solely into the model's behavior. Model abuse mitigation (unauthorized use of your product as a free proxy to the underlying model, or system-prompt extraction) is mitigated through rate limiting (companion §60.2) tied to authenticated identity rather than IP address alone (since IP-based limits are trivially evaded), and through monitoring for known extraction-attempt patterns (repeated requests probing for the system prompt) as a specific class of anomaly.

### 30.7 Secrets Handling and Policy Engine Implementation Mechanics

Secrets handling (§13.7) mechanically requires that prompt-construction code retrieve secrets from a secrets manager (companion §49.5) only at the point of actual tool execution — never assembling a secret into text that becomes part of a prompt sent to a model — and that logging code (§31) explicitly excludes or redacts any field known to carry sensitive values before persistence. **Policy engines** are implemented as a centralized rule evaluation service, checked before a tool call is executed (not merely before a response is shown to a user) — taking the requesting user's role/permissions, the specific tool and arguments requested, and returning an explicit allow/deny decision, directly extending the companion handbook's RBAC/ABAC enforcement point (companion §30.6) to sit specifically between agent decision-making (§25.2) and actual tool execution.

### 30.8 Engineering Intuition

> **Which prompt injection defense should I implement first?** Privilege separation and least-privilege tool scoping (§30.2, §30.6) — because it limits damage regardless of whether injection detection succeeds, it should be in place before investing heavily in injection-detection classifiers, which will never be perfectly reliable.

> **Why did my rule-based guardrail fail to catch an injection attempt a user reported?** Rule-based guardrails (§30.5) only catch anticipated patterns by construction — a novel phrasing evading a fixed regex is expected, not a sign the regex was written incorrectly; the fix is adding a classifier or model-based layer, not attempting to enumerate every possible phrasing in rules.

> **What would over-engineering look like here?** Building a custom policy engine (§30.7) before the basics — least-privilege tool scoping and retrieval-layer access-control filtering (§30.4) — are in place; a sophisticated policy engine adds little if the underlying tool/retrieval permissions it's meant to enforce aren't already scoped correctly.

### 30.9 Decision Tree: What AI Security Mechanism Do I Need to Implement Next?

```
Do your tool definitions enforce the narrowest possible parameter
scope (schema-level constraints, §30.6), independent of the
model's judgment?
  NO  -> Fix this FIRST -- it limits damage regardless of every
         other defense's success or failure.
Does your retrieval layer enforce metadata-based access control
STRUCTURALLY (§30.4), not just via prompt instructions?
  NO  -> Fix this next -- prompt-level-only access control is not
         a real guarantee.
Do you have at least a rule-based guardrail layer (§30.5) for
common, anticipated injection/policy-violation patterns?
  NO  -> Add this -- cheapest layer, catches the most common cases.
  YES -> Are novel/unanticipated attack phrasings getting through?
    YES -> Add a classifier or model-based guardrail layer (§30.5)
           -- and evaluate its own error rate (§29) periodically.
Are secrets ever assembled into prompt text sent to a model?
  YES -> Fix immediately (§30.7) -- this is a direct credential-
         leakage risk regardless of every other defense.
```

### 30.10 Python Snippet: A Schema-Level Tool Constraint (Structural, Not Prompted)

```python
# Demonstrates §30.6: constraining a tool's SCHEMA so a dangerous
# request is structurally impossible, rather than relying on the
# model's judgment or a prompt instruction alone.

def execute_refund(user_id, order_id, amount):
    MAX_AUTO_REFUND = 100.00   # structural cap -- not a prompt
                                # instruction the model could ignore
                                # or be manipulated into bypassing

    if amount > MAX_AUTO_REFUND:
        return {
            "status": "requires_human_approval",  # §25.8: human-
                                                     # in-the-loop,
                                                     # triggered
                                                     # structurally
            "reason": f"Amount ${amount} exceeds auto-approval "
                      f"limit ${MAX_AUTO_REFUND}",
        }

    # Only reachable for amounts within the structurally-enforced
    # limit -- no prompt injection or model error can request a
    # refund exceeding this, because the check happens in code,
    # not in the model's reasoning.
    return process_refund(user_id, order_id, amount)
```

### 30.11 Further Reading

- OWASP Top 10 for Large Language Model Applications — the practical, current reference for §30.2-30.6's defense catalog.
- NIST AI Risk Management Framework — a broader policy/governance reference underlying §30.7's policy-engine design.

---
