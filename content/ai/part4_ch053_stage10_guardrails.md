## 53. Nova Stage 10: Guardrails (Prompt Injection Defenses, PII Protection, Policy Engines)

### 53.1 What Broke

As Nova's document corpus (§47) grows to include user-uploaded content, and its tool set (§49-51) grows to include real actions, a security review ahead of an enterprise sales deal surfaces two concrete risks that were never addressed: uploaded documents could contain injected instructions (§13.2's indirect injection), and no system currently prevents Nova's tools from being invoked with unauthorized arguments beyond the schema constraints already in place since Stage 6.

### 53.2 Why

§13.1 established that any content entering Nova's context — including user-uploaded documents now retrieved via RAG (§47) — is a potential attack vector; Nova's growing capability (documents, memory, tools, agentic multi-step behavior) has correspondingly grown its attack surface at every stage without a dedicated security layer being added since Stage 6's schema-level tool constraints.

### 53.3 Candidates and Their Costs

**Option A — a single, comprehensive model-based guardrail checking every input and output for every possible policy violation:** Maximally thorough but highest latency/cost, added to every single request regardless of actual risk level. **Option B — layered defenses matched to specific, identified risks:** Rule-based PII detection (cheap, catches structured PII), a classifier for injection-pattern detection specifically on retrieved/uploaded content (§30.2), and a policy engine (§30.7) gating tool execution specifically — each layer targeted at a specific, named risk rather than one expensive blanket check.

### 53.4 Chosen Solution

Option B: layered defenses matched to Nova's actual risk surface, directly following §30.2's layered-defense principle. Retrieved document content (§47) is now explicitly flagged for injection-pattern indicators before being included in prompts; a policy engine (§30.7) is introduced sitting between agent decision-making (§51.9) and actual tool execution, checking the requesting user's permissions against the specific tool and arguments requested; PII detection (§30.4) is applied to content before it's logged (§31.3) and before third-party model calls, closing a gap that existed silently since Stage 1.

### 53.5 What It Enabled

Nova can now safely ingest user-uploaded and third-party documents into its RAG corpus without the indirect-injection risk that growth otherwise introduced, and tool execution is now protected by an explicit, auditable authorization layer independent of the model's own judgment — directly the prerequisite for Stage 11's enterprise deployment, where multiple customers' data and permissions must be strictly isolated and defensible in a security review.

### 53.6 The New Tradeoff This Introduced

Every layer added introduces latency and cost to some fraction of requests (document ingestion now includes an injection-scan step; every tool call now passes through the policy engine) — a real, evaluated cost (§29.7's safety dimension, now formally tracked) accepted specifically because the risk it addresses (§53.1's security review finding) is more costly to leave unaddressed, especially for the enterprise customers Stage 11 targets. Guardrail false-positive rate (§40.8) now requires its own ongoing monitoring and tuning discipline that didn't exist in any earlier stage.

### 53.7 Engineering Intuition

> **Why layered, targeted defenses rather than one comprehensive check?** Because a single blanket model-based guardrail (§53.3 Option A) adds its cost and latency to every request regardless of actual risk — targeted layers apply the more expensive checks (model-based classification) only where the specific risk (injection via uploaded documents) actually exists.

### 53.8 Decision Tree: What Guardrail Layer Does a New Nova Capability Need?

```
Does the capability ingest content from a source Nova doesn't
fully control (user uploads, third-party documents)?
  YES -> Add injection-pattern scanning (§30.2) specifically for
         that content before it enters any prompt.
Does the capability execute a real action with consequences
(any tool, §49)?
  YES -> Route through the policy engine (§53.4) before execution,
         regardless of the model's own confidence.
Does the capability log or send content to a third-party model
provider?
  YES -> Apply PII detection/redaction (§30.4) before logging or
         sending.
```

### 53.9 Python Snippet: Nova's Policy Engine Check Before Tool Execution

```python
# Nova Stage 10: a policy engine gate sitting between agent
# decision and actual tool execution (§53.4).

def policy_engine_check(user_role, tool_name, tool_arguments):
    POLICY_RULES = {
        "check_order_status": {"allowed_roles": ["customer", "support_agent"]},
        "issue_refund": {"allowed_roles": ["support_agent"],
                          "max_amount": 100.00},
    }

    rule = POLICY_RULES.get(tool_name)
    if rule is None:
        return False, "No policy defined for this tool -- deny by default."

    if user_role not in rule["allowed_roles"]:
        return False, f"Role '{user_role}' not authorized for '{tool_name}'."

    if "max_amount" in rule and tool_arguments.get("amount", 0) > rule["max_amount"]:
        return False, "Amount exceeds policy limit -- requires human approval."

    return True, "Allowed."

allowed, reason = policy_engine_check("customer", "issue_refund", {"amount": 50})
print(f"Allowed: {allowed} | Reason: {reason}")
```

### 53.10 Further Reading

- §13 (AI Security Mental Model), §30 (AI Security Mechanics), §40 (Production AI Security Operations) — the direct foundation of this stage.

---
