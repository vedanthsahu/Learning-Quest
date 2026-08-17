## Project 17: Multi-Agent Platform

### Problem Statement

Some tasks are too complex for a single AI copilot interaction to handle in one step — they require breaking a goal into sub-tasks, potentially handled by different specialized agents (a research agent, a writing agent, a review agent), coordinating between them, and handling the reality that any individual step might fail or produce a poor result. The business wants a platform that can orchestrate multiple specialized agents toward a larger goal, reliably, without one agent's failure silently derailing the whole task or, worse, looping forever.

### Functional Requirements

- Accept a high-level goal and break it into a sequence (or graph) of sub-tasks assigned to specialized agents.
- Execute sub-tasks, passing relevant output from one agent as input to the next where needed.
- Detect when a sub-task has failed and apply a defined recovery strategy (retry, reassign, escalate to a human).
- Report overall progress and the final result of the multi-agent task.

### Non-Functional Requirements

- **No infinite loops**: a coordination or retry mechanism must have a hard bound — the system must never spin indefinitely on a task that can't be completed.
- **Observability into the reasoning chain**: it should be possible to see the full sequence of sub-tasks, which agent handled each, and what each produced — not just the final result.
- **Cost awareness**: each agent invocation has a real cost (computation, external API calls); an unbounded or runaway chain of agent calls is a direct, measurable cost risk, not just a performance concern.
- **Graceful degradation**: if one specialized agent is unavailable or failing, the overall task should fail clearly and informatively rather than hanging indefinitely or silently producing an incomplete result presented as complete.

### Project Scope

**In scope**: goal decomposition into sub-tasks, sequential/graph-based multi-agent execution, failure detection and bounded retry/escalation, full execution tracing. **Out of scope**: agents dynamically writing and executing arbitrary new code, agents autonomously modifying their own goal without human checkpoint, real-time collaborative multi-agent negotiation.

### Engineering Questions (Answer Them Yourself First)

- If Agent A's output is used as Agent B's input, and Agent A produces a subtly malformed result, what happens to Agent B, and eventually to the overall task, if nothing checks this in between?
- What's the actual difference between "this task step failed and should be retried" and "this task step failed in a way that will never succeed no matter how many times it's retried"? Does your design need to tell these apart?
- If a multi-step task involves 10 sequential agent calls, and step 7 fails, should steps 1-6 be redone, or is there something you need to have preserved from them?
- How would you know, from the outside, that a multi-agent task is "still working" versus "stuck in a loop that looks like progress but isn't converging"?

### Architecture Thinking

Sketch a multi-agent task as an explicit sequence or graph of steps, each with a defined input, output, and the specific agent responsible — does this need to be a rigid, fixed pipeline, or does it need to support branching based on intermediate results? Consider what "checkpointing" progress after each successful step would buy you if a later step fails — would you need to redo everything, or just resume from the last successful point? Estimate: if each agent call costs a small amount of money and takes a few seconds, and a single task could theoretically retry indefinitely, what's the actual maximum cost exposure of one single user-initiated task with no bound in place?

### Progressive Hint System

**Level 1**: Consider explicitly modeling a multi-agent task as a defined series of steps with clear boundaries, rather than one continuous, opaque process — what does having explicit boundaries let you do that you couldn't do otherwise? **Level 2**: Research checkpointing intermediate results after each successful step, so a failure doesn't require restarting the entire task from the beginning. **Level 3**: Research hard limits on total retries, total steps, and total cost/time budget per task as explicit, enforced ceilings — not just informal expectations — and research validating an agent's output against an expected shape before passing it to the next step. **Level 4**: A standard design models a multi-agent task as an explicit directed graph (or simple sequence) of steps, checkpoints output after each successful step so failures resume rather than restart, validates each step's output against an expected schema before using it as another agent's input, and enforces hard, explicit limits on total steps, total retries per step, and total elapsed time/cost — escalating to a human or failing the task cleanly once any limit is reached, rather than continuing indefinitely.

### Common Engineering Traps

- **Passing one agent's raw output directly into the next agent's input with no validation in between** — what happens when the first agent's output is malformed or unexpected in a way the second agent can't handle gracefully?
- **A retry mechanism with no maximum retry count, relying on "it'll eventually succeed"** — what's the actual cost and time exposure of a task that can never succeed but is allowed to retry forever?
- **Restarting an entire multi-step task from step one after a failure at step seven** — what does this do to cost and latency, and is it actually necessary?
- **No overall task-level timeout or step-count ceiling, only per-step timeouts** — could a task still run indefinitely by cycling through many individually-fast, successful steps that never actually converge on the goal?

### Reflection Questions

- How would you distinguish, purely from your execution trace, a task that's "on track but taking a while" from one that's "looping without making real progress"?
- If a human needs to be looped in when automated recovery is exhausted, what specific information would they need to see to actually help, rather than just being told "it failed"?
- What would you need to add if two different sub-tasks in the same overall goal could safely run in parallel rather than strictly sequentially — does your design accommodate this, or does it assume everything is sequential?

### Completion Checklist

- [ ] I have an explicit step/graph model for multi-agent tasks, not one opaque process.
- [ ] I have checkpointing so a failure doesn't require restarting from the beginning.
- [ ] I have hard, enforced limits on total steps, retries, and cost/time budget.
- [ ] I have output validation between agent steps, not raw, unchecked pass-through.
- [ ] I am ready to compare my reasoning against the Solution Guide.

---
