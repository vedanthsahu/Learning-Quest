## 10. Model Context Protocol (MCP)

### 10.1 What it is [B]

**MCP** is an open protocol, introduced by Anthropic, that standardizes how AI applications connect to external **tools, data and prompts**. It's "USB-C for AI integrations": write a server once and any MCP-capable host can use it. Messages are **JSON-RPC 2.0**.

### 10.2 The three roles — the most-tested boundary [B][C]

```
┌──────────── HOST (Claude Code, Claude Desktop, your app) ────────────┐
│  LLM + UI + user consent + security policy                           │
│   ├── MCP client A ◄──1:1 connection──► MCP server A ──► GitHub API  │
│   └── MCP client B ◄──1:1 connection──► MCP server B ──► Postgres    │
└───────────────────────────────────────────────────────────────────────┘
```

| Role | Responsibilities | Not its job |
|---|---|---|
| **Host** | The user-facing app. Creates and manages clients, **owns the LLM interaction**, enforces **user consent, permissions and security policy**, decides what context reaches the model, aggregates tools from all servers | Implementing the external API |
| **Client** | Lives inside the host; **one client per server**. Opens the connection, negotiates capabilities, routes requests and responses, maintains the session | Deciding policy for the user (that's the host) |
| **Server** | Exposes capabilities (tools, resources, prompts). **Executes tool calls against the external system**, validates inputs, authenticates to the backend, returns results | Talking to the LLM directly or seeing the whole conversation |

Key point: **the server never sees the full conversation or the model.** It only receives specific requests. The host controls what is shared.

### 10.3 Server primitives [B]

| Primitive | Controlled by | Purpose | Example |
|---|---|---|---|
| **Tools** | **Model** (the LLM decides to call; host may require approval) | Actions or computations | `create_issue`, `run_query` |
| **Resources** | **Application/host** (it decides what to attach) | Read-only data or context, by URI | `file:///…`, a DB schema, a doc |
| **Prompts** | **User** (explicitly chosen, often as slash commands) | Reusable prompt templates | `/summarize-pr` |

### 10.4 Client features (offered to servers) [B]

- **Sampling**: the *server* asks the *client/host* to run an LLM completion on its behalf. The server needs no model API key, and the **host keeps control** (it can review or deny the request and choose the model). *Sampling means the server borrows the host's model.*
- **Roots**: the client tells the server which filesystem or URI boundaries it may operate in.
- **Elicitation**: the server asks the user (through the host) for additional input **(version-dependent: newer spec)**.

### 10.5 Lifecycle and discovery [B]

```
client → initialize {protocolVersion, clientCapabilities}
server → {serverCapabilities: tools? resources? prompts? …}
client → initialized
client → tools/list | resources/list | prompts/list     (capability discovery)
model decides → client → tools/call {name, arguments} → server executes → result
server → notifications (e.g. tools list_changed)
```

Tool registration is the **server declaring tools** (name, description, JSON input schema) in its `tools/list` response; the host passes those definitions to the model.

### 10.6 Transports [B]

- **stdio**: the host launches the server as a local subprocess. Local tools, simplest, inherits local trust.
- **Streamable HTTP**: a remote server over HTTP (it replaced the older HTTP+SSE transport). **(version-dependent)**

### 10.7 Security [D][C]

- **Authentication:** stdio servers usually use local credentials or env vars. Remote HTTP servers use **OAuth 2.1**-based authorization in the spec **(version-dependent detail)**.
- **Authorization:** the **server** must enforce what the authenticated principal may do in the backend. The **host** enforces user consent for tool calls and what data is exposed.
- Treat tool descriptions and results from third-party servers as **untrusted**. They can carry prompt injection ("tool poisoning").
- Least privilege: scope tokens per server and never pass the user's broad credentials through unnecessarily.
- Only install trusted servers. A local stdio server runs code on your machine.

### 10.8 MCP vs an ordinary API, and where Claude fits [C]

- An ordinary REST API is bespoke per integration. MCP is a **standard interface plus discovery**, so any host can use any server without custom glue.
- MCP doesn't replace the external API; the server *wraps* it.
- **Claude Code** is an MCP host (`claude mcp add …`, project `.mcp.json`, scopes local/project/user).
- The **Messages API** can act as an MCP client for *remote* servers via the MCP connector **(beta; needs both `mcp_servers` and an `mcp_toolset` tool entry)**.
- In your own app with the plain API, *you* are the host. You call the MCP server and pass tools and results through ordinary tool use.

### Common Exam Traps

- The **server executes tools**; the **host/client** handles consent and the model; the **model** only requests.
- One client per server connection, inside a host.
- Resources are app-controlled context; tools are model-controlled actions; prompts are user-controlled templates.
- **Sampling** goes server → client (server requests a completion), not the client asking the server for data.
- MCP servers don't automatically get your conversation history.
- MCP standardizes integration; it isn't a model, an agent framework, or a replacement for authorization.

### Check Yourself

1. Who should prompt the user before a destructive MCP tool runs?
2. A server needs an LLM summary of data it fetched but must not hold an API key. Which feature?
3. A DB schema the app wants to attach as context: tool, resource or prompt?
4. A team exposes an internal API as MCP. Where must per-user authorization checks live?
5. What message lets a client learn a server's tools?

**Answers**

1. The host (it owns user consent and permissions), as Claude Code does with permission prompts.
2. Sampling (the server asks the client/host to run the completion).
3. A resource (application-controlled read-only context).
4. In the MCP server's tool implementation and backend (plus host consent). The model and client aren't authorization layers.
5. `tools/list` (after capability negotiation in `initialize`).
