## Project 16: AI Copilot Platform

### Problem Statement

Beyond answering questions from documents, the business wants an AI assistant embedded in the product that can actually *do things* on a user's behalf — draft a reply, summarize a thread, create a task, look up a record — through natural-language requests, while maintaining a coherent, multi-turn conversation and never taking a destructive or sensitive action without appropriate confirmation.

### Functional Requirements

- Maintain a multi-turn conversation with a user, remembering earlier context within that session.
- Interpret a natural-language request and determine which of several available actions (tools) it corresponds to, if any.
- Execute the identified action, using the actual application's existing APIs, and return a result to the user.
- Require explicit user confirmation before performing an action with real, hard-to-reverse consequences (e.g., deleting something, sending a message on the user's behalf).

### Non-Functional Requirements

- **Safety**: an ambiguous or misinterpreted request must not result in an unintended, hard-to-reverse action being taken silently.
- **Extensibility**: adding a new action the copilot can perform should not require rewriting how the copilot interprets requests in general.
- **Conversation coherence**: the copilot's understanding of context should persist correctly across multiple turns within a session, without mixing up context from unrelated, concurrent sessions (other users, or the same user's other conversations).
- **Observability**: it should be possible to trace exactly which action was taken (or considered and rejected) in response to a given request, for debugging and for user trust.

### Project Scope

**In scope**: multi-turn conversation state, natural-language-to-action mapping (tool selection), action execution with confirmation gating for destructive actions, session isolation. **Out of scope**: the copilot autonomously chaining multiple actions together without human input between them (that's Project 17's concern), fine-tuning a custom model, voice interfaces.

### Engineering Questions (Answer Them Yourself First)

- If a user says "delete the last one" without specifying what "the last one" refers to, what does the system need to have remembered from earlier in the conversation to interpret this correctly?
- What's the difference between the copilot *deciding* to take an action and the copilot *actually taking* that action — should these always happen in the same instant, for every kind of action?
- If you need to add a fifth kind of action the copilot can perform, should that require changing the code that decides *which* action fits a given request?
- If two different users are chatting with the copilot at the same time, what could go wrong if their conversation histories aren't kept strictly separate?

### Architecture Thinking

Sketch what "remembering earlier context" requires you to store, and for how long, and scoped to what (a single conversation? a user? something else?). Consider the difference between actions that are safe to perform immediately once identified versus actions that need an explicit, separate confirmation step before execution — where does that fork happen in your design? Estimate: if you need to support 20 different possible actions eventually, does hardcoding a large conditional chain checking for each one seem like it will scale as a maintainable design?

### Progressive Hint System

**Level 1**: Consider what has to be stored, and looked up on every new message, for a multi-turn conversation to make sense of a reference like "the last one." **Level 2**: Research a registry or catalog-based pattern for available actions, where a new action is *added* to a catalog rather than requiring changes to a central dispatching function. **Level 3**: Research explicitly classifying actions by risk level (read-only, reversible, destructive) and gating execution of higher-risk actions behind an explicit confirmation step, and research using a unique session identifier to scope all conversation state and prevent cross-session bleed. **Level 4**: A standard design stores conversation history keyed by a unique session ID, uses a registry of available actions (each self-describing its name, required parameters, and risk level) rather than hardcoded interpretation logic, classifies each identified action by risk level and requires an explicit user confirmation round-trip before executing anything above a "safe" threshold, and logs every interpretation decision (including ones where no action was taken) for observability.

### Common Engineering Traps

- **Storing conversation state in a single global variable or unscoped structure rather than keyed by a unique session identifier** — what happens the moment two users are chatting with the copilot simultaneously?
- **A single large conditional chain that checks the user's request against every possible action one by one** — what has to change, and how much code has to be touched, every time a new action is added?
- **Executing a destructive action immediately upon interpretation, with no separate confirmation step** — what happens if the interpretation was wrong, and the action can't be undone?
- **Not logging which action was considered and why, only logging the final result** — how would you debug a case where the copilot took the wrong action, without this information?

### Reflection Questions

- How would you test that your copilot correctly asks for confirmation before every destructive action, across every action type, rather than trusting each action's implementation to remember to do so individually?
- If the copilot misinterprets a request and confirms the wrong action with the user, whose fault is that — the natural-language interpretation, or a UI/confirmation-message clarity issue? Does your design let you tell the difference?
- What would you need to change if two different users' conversations needed to sometimes share context (e.g., a shared team conversation)? Does your session-scoping design accommodate this, or actively prevent it?

### Completion Checklist

- [ ] I have conversation state correctly scoped and isolated per session.
- [ ] I have an extensible action-registry design, not a hardcoded conditional chain.
- [ ] I have a confirmation gate specifically for higher-risk/destructive actions.
- [ ] I have a logging approach that captures interpretation decisions, not just final outcomes.
- [ ] I am ready to compare my reasoning against the Solution Guide.

---
