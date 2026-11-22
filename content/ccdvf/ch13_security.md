## 13. Security and Safety

Most of this is your existing security knowledge [A], applied to a system where **the model's output is untrusted input** and **data can carry instructions**.

### 13.1 Threats [B]

| Threat | What it is | Primary defence |
|---|---|---|
| **Direct prompt injection** | The user tries to override instructions ("ignore your rules") | Clear system prompt, output validation, least-privilege tools |
| **Indirect prompt injection** | Instructions hidden in *data*: web pages, emails, PDFs, tool results, MCP tool descriptions | Treat all retrieved and tool content as untrusted; restrict what the agent can do after reading it |
| **Jailbreak** | Attempts to get disallowed content | Model safeguards plus your policy prompt plus moderation of outputs |
| **Data leakage** | The model reveals system-prompt secrets, other users' data, PII | **Never put secrets in prompts**; per-user data scoping in tools; output filtering |
| **Excessive agency** | The agent can do more damage than the task needs | Least privilege, approvals, sandboxing |

### 13.2 Design principles [D]

- **Least privilege:** give each tool and agent the minimum scope: read-only DB user, scoped API tokens, allow-listed commands and domains.
- **Authentication ≠ authorization.** AuthN proves who the caller is; AuthZ decides what they may do. *The model is never an authorization layer.* Enforce AuthZ in tool code and the backend.
- **Validate inputs** to tools (schema plus business rules, path and URL allow-lists) and **validate outputs** before acting on or displaying them (SQL, shell, HTML/XSS).
- **Human approval** for irreversible or high-impact actions (payments, deletes, external emails, deploys).
- **Sandboxing:** run code execution and agent shells in isolated containers or VMs with restricted network and filesystem. Claude Code offers sandboxing and permission modes; Managed Agents run tools in per-session containers.
- **Secrets management:** keep keys in env or secret stores, outside prompts and logs. Use server-side tool execution so the model never sees credentials. **(version-dependent)** Managed Agents vaults inject credentials at egress without exposing them to the sandbox.
- **Guardrails:** input classification, output checks, rate and budget limits, and monitoring for anomalous tool use.

### 13.3 Agent-specific [C]

- Content read by an agent (web, email, tickets) can steer its *next tool call*. The classic exfiltration chain is: read a malicious page → call `send_email` with secrets. Break the chain by limiting outbound tools, requiring approval, and separating read-untrusted from act-privileged steps.
- Tool results are data, not instructions.
- MCP: only connect trusted servers; third-party tool descriptions can be poisoned.

### Common Exam Traps

- "Add a system prompt saying 'never reveal X'" is not adequate protection for secrets. Don't put them there.
- Delimiters and instructions reduce injection; architecture (privilege, approval, validation) contains it.
- The model doesn't authorize anything. Check permissions in code.
- Untrusted tool output is a common distractor; it's *input*, not trusted context.
- Human-in-the-loop goes before consequential actions, not as a substitute for validation.
