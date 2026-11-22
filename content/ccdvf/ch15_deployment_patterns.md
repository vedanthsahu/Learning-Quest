## 15. Deployment Patterns and Responsibility Boundaries

Your Q52 miss lives here. The question is always: **who runs the agent loop, who executes the tools, and where does the data live?**

### 15.1 The spectrum [B][C]

| Pattern | Agent loop / harness | Tool execution | Infra you operate | Typical fit |
|---|---|---|---|---|
| **1. API-based app** (single calls or workflows) | Your code | Your code (client tools); Anthropic for server tools (web search, code exec) | Your app | Most product features |
| **2. Customer-controlled tool execution** | Your loop *or* Anthropic's | **Your environment** executes tools and returns `tool_result`s | Your tools and data stay in your network | Tools must touch private systems or data |
| **3. Fully customer-controlled harness** (Claude Agent SDK, or your own framework) | **You host** the harness (Claude Code engine as a library) | Your infra | Everything except the model | Full control, compliance, custom runtime |
| **4. Managed agents** (Claude Managed Agents, beta) | **Anthropic** runs the loop | **Anthropic-hosted per-session sandbox** (bash, files, code), plus your custom tools via results you send back; **(version-dependent)** self-hosted sandboxes possible | Agent config plus your custom tools | Long-running hosted agents without operating infrastructure |

Two questions separate them:

1. **Who supplies the harness?** You (manual loop), the SDK (Tool Runner, Agent SDK), or Anthropic (Managed Agents).
2. **Who supplies the deployment and compute?** You (patterns 1–3) or Anthropic (pattern 4).

### 15.2 Responsibilities [D]

| Concern | Anthropic | You |
|---|---|---|
| Model serving, safety classifiers | ✓ | |
| Server tools (web search, code execution) execution | ✓ | Enable and configure them |
| Client/custom tool execution, their security and AuthZ | | ✓ |
| Agent loop in patterns 1–3 | | ✓ |
| Agent loop and sandbox in Managed Agents | ✓ | Agent config, permissions policy, custom tools |
| Conversation and state storage | Managed Agents sessions | ✓ in API patterns |
| Data residency, retention settings | Provides options (e.g. inference geography, ZDR eligibility vary by model) | Choose and configure |
| End-user authZ, approvals, monitoring | | ✓ |

### 15.3 Security and data boundaries [D]

- With **client tools**, sensitive systems are touched only by your code, and **only what you return in `tool_result` reaches the model**.
- With **server tools or managed sandboxes**, execution happens on Anthropic infrastructure, so consider what data you put there.
- Cloud platforms (Amazon Bedrock, Google Vertex AI, Microsoft Foundry) serve Claude within your cloud agreement; **feature availability differs by platform (version-dependent)**.

### Common Exam Traps

- The Tool Runner (an SDK helper) isn't the Claude Agent SDK (the full Claude Code harness). Neither hosts anything for you.
- Managed Agents is the only option where Anthropic runs **both** the loop and the tool sandbox.
- "Data never leaves our network" points to customer-executed tools or a self-hosted harness. It doesn't point to hosted sandboxes.
- In every pattern **the model never executes your client tools**.
