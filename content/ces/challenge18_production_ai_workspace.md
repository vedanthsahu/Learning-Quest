## Project 18: Production AI Workspace

### Problem Statement

The business wants to take everything built so far — document management, search, RAG-based question answering, a copilot with actions, and multi-agent task orchestration — and ship it as one coherent, production-grade workspace product that real customers depend on daily. This is not a new feature to design from scratch; it's the integration, hardening, and operational readiness of everything that came before, under the reality that this is now a system other people's work depends on.

### Functional Requirements

- Integrate document management, search, RAG question-answering, copilot actions, and multi-agent orchestration into one coherent product experience.
- Support multiple customer organizations, each with their own users, documents, and data, fully isolated from one another.
- Provide administrators visibility into usage, costs, and system health for their own organization.
- Support the system evolving over time — new features added, existing ones changed — without extended downtime or data loss.

### Non-Functional Requirements

- **Multi-tenant isolation**: one customer organization must never be able to access, or even infer the existence of, another organization's data, under any circumstance, including bugs.
- **Operational readiness**: the system must be observable, debuggable, and recoverable when something goes wrong — not just functionally correct when everything goes right.
- **Cost predictability**: given the AI-heavy nature of this system, the business needs visibility into and control over the variable, usage-driven costs of running it (search, retrieval, language model calls, agent orchestration).
- **Evolvability**: every subsystem integrated here (search, RAG, copilot, multi-agent) was designed and evolved independently across this series — integrating them must not require re-deriving their individual correctness properties from scratch.

### Project Scope

**In scope**: multi-tenant data isolation across every integrated subsystem, unified observability and cost tracking, a deployment and migration strategy supporting ongoing evolution, an operational readiness review across the whole integrated system. **Out of scope**: building any new core feature not already covered by projects 1-17 — this project is explicitly about integration and production-hardening, not new capability.

### Engineering Questions (Answer Them Yourself First)

- If a bug in one subsystem (say, the search authorization filter) is fixed correctly there, does that guarantee the RAG platform built on top of it is also safe, or does the RAG platform need its own independent verification?
- What does "multi-tenant isolation" mean specifically for a component like the multi-agent platform's checkpoint store, or the metrics platform's ingested data — do these need tenant scoping too, even though they weren't originally designed with multiple customer organizations in mind?
- If this system has five different subsystems, each potentially built by a different person or team over time, what's the risk of each one implementing tenant isolation slightly differently?
- Given that language model calls have a real, variable cost, how would an administrator know if one specific customer's usage pattern was becoming unexpectedly expensive, before it became a large, surprising bill?

### Architecture Thinking

Sketch, across every subsystem built in this series (Projects 1-17, wherever they'd plausibly be part of this integrated workspace), where tenant identity needs to be threaded through — is it enough to check it once, at the very outer edge of a request, or does it need to be verified again at each subsystem's own data-access boundary? Consider what "one coherent product" implies about how these previously-separate projects' data models need to relate to each other (shared user/tenant identity, for instance) versus remaining fully independent. Estimate: if you have 100 customer organizations, and any one subsystem has even a small, rare tenant-isolation bug, what's the actual blast radius and reputational risk of that bug, given what this product now holds (customer documents, conversations, potentially sensitive AI-generated content)?

### Progressive Hint System

**Level 1**: Consider whether trusting a single, outer-edge tenant check to protect every subsystem behind it is safe, or whether each subsystem needs to independently enforce tenant scoping at its own data-access layer, as defense in depth. **Level 2**: Research the pattern of propagating a tenant identifier through every layer of a request — including into background jobs, agent orchestration steps, and metrics — so that no subsystem can accidentally operate without it. **Level 3**: Research per-tenant cost attribution and budget alerting as an operational practice, and research staged/canary rollout strategies for evolving a live, multi-tenant system without downtime. **Level 4**: A standard approach threads a tenant ID through every request, background job, and data record across every integrated subsystem, with each subsystem's own data-access layer enforcing tenant scoping independently (not relying solely on an outer gateway-level check) as defense in depth; costs are attributed and tracked per-tenant at the point of each expensive call (search, LLM invocation, agent step); schema and service evolution follows the same zero-downtime migration and staged-rollout discipline established for any single production service, applied consistently across every integrated subsystem.

### Common Engineering Traps

- **Relying on a single, outer-edge tenant check (e.g., at an API gateway) and assuming every subsystem behind it is therefore automatically safe** — what happens if one specific internal subsystem has a bug that bypasses or ignores this outer check?
- **Treating cost tracking as an afterthought, added only after a surprising bill arrives** — what visibility does the business actually have into per-tenant cost until that point?
- **Assuming that because each individual subsystem (search, RAG, copilot) was independently correct in its own project, the integrated whole is automatically correct too** — what's the actual risk of integration-specific bugs that don't exist in any individual subsystem alone?
- **Deploying schema or behavior changes to the integrated system the same way you would to a single, simple service, without considering the added blast radius of multiple integrated subsystems depending on shared data models.**

### Reflection Questions

- If you had to prove, convincingly, to a security-conscious enterprise customer that their data is genuinely isolated from every other customer's, what specifically would you show them, and does your design actually support producing that evidence?
- How would you decide which subsystem "owns" enforcing tenant isolation for a piece of data that flows through multiple subsystems (e.g., a document that's stored, searched, retrieved for RAG, and referenced by a copilot action)?
- What would "operational readiness" concretely mean for this integrated system, beyond what any single subsystem's own readiness checklist already covers?

### Completion Checklist

- [ ] I have tenant scoping enforced independently at each subsystem's own data-access layer, not only at an outer edge.
- [ ] I have a per-tenant cost-attribution approach for AI-heavy, variable-cost operations.
- [ ] I have explicitly considered integration-specific risks beyond each subsystem's individually-proven correctness.
- [ ] I have a migration/evolution strategy that accounts for the full integrated system's blast radius.
- [ ] I am ready to compare my reasoning against the Solution Guide — this is the final project in the series.

---
