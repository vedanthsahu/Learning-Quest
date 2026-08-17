## Project 16: AI Copilot Platform — Solution Guide

### Business Reasoning

The business need is an AI assistant that doesn't just answer questions but takes real action on a user's behalf. The genuine engineering risk this introduces, beyond Project 15's RAG platform, is that a *misinterpreted* natural-language request can now cause a real, potentially irreversible side effect — not merely a wrong or unhelpful answer. Safety and extensibility are the two requirements that most shape this design.

### Requirements Analysis

The safety requirement (never silently take a destructive action on a misinterpretation) demands a structural gate between "the copilot decided to do X" and "X actually happened" for any action with real consequences. The extensibility requirement (adding a new action shouldn't require rewriting interpretation logic) rules out any hardcoded, action-by-action conditional chain, pointing instead toward a registry-based, self-describing action catalog.

### Architecture

```
User message -> [load conversation history by session_id] -> [interpret intent against action registry]
  -> action identified, risk level checked
     - LOW risk (read-only): execute immediately
     - HIGH risk (destructive/irreversible): return a confirmation prompt, wait for explicit user "yes"
  -> execute via the action's own handler -> log the full decision (considered, chosen, executed/skipped)
```

### Tradeoff Discussion

**Hardcoded interpretation logic vs. a registry-based action catalog.** A hardcoded conditional chain checking the request against each known action is simple for a small, fixed number of actions, but every new action requires modifying this central dispatching logic — a direct violation of the extensibility requirement as the action count grows. A registry (each action self-describes its name, parameters, and risk level; the interpretation step matches against the registry generically) decouples adding a new action from modifying core interpretation code, at the cost of a small amount of upfront structural design.

**Uniform confirmation for all actions vs. risk-tiered confirmation.** Requiring confirmation for every single action (even harmless, read-only ones) is maximally safe but produces a frustrating, over-cautious user experience that likely gets ignored or clicked through reflexively, undermining the very safety it's meant to provide. Risk-tiered confirmation (only destructive/irreversible actions require explicit confirmation; safe, reversible actions execute immediately) matches friction to actual risk, preserving both safety and usability — but requires actually, correctly classifying every action's risk level up front, a real design responsibility that can't be skipped.

### Alternative Designs Considered and Rejected

**Executing every identified action immediately, with no confirmation step for any action type.** Rejected outright — this is the challenge's third named trap: a misinterpreted request executing a destructive action immediately, with no chance to catch the error before it's irreversible, is precisely the safety failure this project's Non-Functional Requirements call out. **Global, unscoped conversation state shared across all users.** Rejected — this is the challenge's first named trap: without session-based isolation, one user's conversation context would leak into or corrupt another's, an obviously unacceptable correctness failure the moment more than one user is active simultaneously.

### Chosen Design

Session-scoped conversation history (keyed by a unique session ID, stored with a bounded retention window); a registry of available actions, each self-describing its name, required parameters, and risk level; an interpretation step matching user intent against the registry generically; a confirmation gate specifically for actions above a "safe" risk threshold; full logging of every interpretation decision, including actions considered but not taken.

### Implementation Walkthrough

```python
class ActionRisk(str, Enum):
    SAFE = "safe"            # read-only, always reversible
    DESTRUCTIVE = "destructive"   # requires confirmation

@dataclass
class Action:
    name: str
    description: str
    risk: ActionRisk
    handler: Callable[..., Awaitable[Any]]

ACTION_REGISTRY: dict[str, Action] = {}   # new actions REGISTER themselves; dispatch never changes

def register_action(name: str, description: str, risk: ActionRisk):
    def decorator(handler):
        ACTION_REGISTRY[name] = Action(name, description, risk, handler)
        return handler
    return decorator

@register_action("summarize_thread", "Summarize a conversation thread", ActionRisk.SAFE)
async def summarize_thread(thread_id: str) -> str: ...

@register_action("delete_task", "Permanently delete a task", ActionRisk.DESTRUCTIVE)
async def delete_task(task_id: str) -> None: ...

async def handle_message(session_id: str, message: str, redis_client, llm_client) -> dict:
    history = await get_conversation_history(session_id, redis_client)   # SCOPED by session_id
    interpretation = await llm_client.interpret(message, history, list(ACTION_REGISTRY.values()))
    log_decision(session_id, message, interpretation)                    # log EVERY decision

    if interpretation.action_name is None:
        return {"reply": interpretation.clarification_or_answer}

    action = ACTION_REGISTRY[interpretation.action_name]
    if action.risk == ActionRisk.DESTRUCTIVE:
        return {"reply": f"This will {action.description.lower()}. Confirm? (yes/no)",
                "pending_action": {"name": action.name, "params": interpretation.params}}

    result = await action.handler(**interpretation.params)               # SAFE -> execute immediately
    await append_to_history(session_id, message, result, redis_client)
    return {"reply": result}

async def confirm_pending_action(session_id: str, pending_action: dict) -> dict:
    action = ACTION_REGISTRY[pending_action["name"]]
    result = await action.handler(**pending_action["params"])            # executes ONLY after confirm
    return {"reply": result}
```

`ACTION_REGISTRY` and `register_action` mean adding a new action requires only a new decorated function, not a change to `handle_message`'s dispatching logic — directly closing the challenge's second named trap. `handle_message` branches explicitly on `action.risk`, executing `SAFE` actions immediately but returning a confirmation prompt (never executing) for `DESTRUCTIVE` ones — the actual execution for a destructive action only happens in `confirm_pending_action`, called separately after the user's explicit "yes," directly closing the third named trap. `get_conversation_history(session_id, ...)` scopes all state to the specific session, closing the first named trap, and `log_decision` is called unconditionally, including when no action is taken, directly satisfying the observability requirement.

### Production Improvements

Add a hard timeout on pending confirmations (e.g., a confirmation not answered within 5 minutes expires and must be re-initiated), preventing a stale confirmation state from being accidentally triggered much later by an unrelated "yes" in a different context. Add per-action rate limiting (this series' Project 02) specifically for destructive actions, as an additional safety layer beyond confirmation alone.

### Scaling Path

Conversation history storage scales using the same session-scoped, TTL-bounded pattern as any per-session cache (Project 03's bounded-cache reasoning, applied per session rather than per key); the action registry itself has no scaling concern, since it's a static, in-process catalog, not a runtime data store.

### Interview Discussion

An AI-copilot-with-actions question tests whether a candidate treats "the model decided to do X" and "X was executed" as the same instant by default (a safety risk) or explicitly separates them with a risk-based gate — see Python Backend Engineering Handbook §89's AI Integration capstone stage for the closely related retrieval-authorization pattern this project's confirmation-gating pattern parallels for action-safety instead of data-access-safety.

### Lessons Learned

The core lesson is that giving an AI system the ability to *act*, not just respond, changes the risk profile of a misinterpretation from "wrong answer" to "wrong, possibly irreversible action" — and the correct response isn't avoiding action-taking capability, but structurally separating interpretation from execution for anything consequential, with risk-tiered confirmation as the concrete mechanism. This exact separation-of-decision-from-execution principle becomes even more critical in Project 17, where actions can chain together without a human in the loop between every step.

---
