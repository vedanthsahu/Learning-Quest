## Project 17: Multi-Agent Platform — Solution Guide

### Business Reasoning

The business need is automating complex, multi-step goals by coordinating specialized agents. The genuine engineering risk, beyond Project 16's single-copilot design, is that chaining multiple autonomous steps together introduces compounding failure modes — a bad intermediate result, an unbounded retry, or a subtle non-converging loop — each of which is individually manageable but collectively demands hard, explicit ceilings rather than optimistic assumptions.

### Requirements Analysis

The no-infinite-loops and cost-awareness requirements are the two most demanding, and they're related: an unbounded retry or step count isn't just a performance risk here, it's a direct, measurable financial risk given real per-agent-call costs. This rules out any design relying on informal expectations ("it should eventually converge") rather than hard, enforced numeric limits.

### Architecture

```
Goal -> [decompose into an explicit step graph] -> Execute step 1 -> validate output -> checkpoint
                                                  -> Execute step 2 (using validated step 1 output)
                                                  -> ... on failure: bounded retry, then escalate/fail
Hard ceilings enforced throughout: max total steps, max retries per step, max elapsed time/cost
```

### Tradeoff Discussion

**Restart-from-beginning vs. checkpoint-and-resume on failure.** Restarting an entire multi-step task from its first step after a late-stage failure is simpler to implement (no need to persist intermediate state) but wastes all the cost and time already spent on the successful earlier steps, and repeats it on every subsequent failure — a real, compounding cost given the project's explicit cost-awareness requirement. Checkpointing after each successful step and resuming from the last checkpoint on failure avoids this waste, at the cost of needing to persist and correctly restore intermediate state.

**Unchecked pass-through vs. schema-validated inter-agent output.** Passing one agent's raw output directly to the next is simpler and avoids upfront schema-design work, but a malformed or unexpected output from the first agent can silently corrupt or crash the second agent's processing, with the failure surfacing far from its actual cause. Validating each step's output against an expected schema before passing it on catches a bad result immediately, at the step where it actually occurred, at the cost of defining and maintaining that schema for every step.

### Alternative Designs Considered and Rejected

**No maximum retry count, relying on eventual success.** Rejected outright — this is the challenge's second named trap, and directly violates the explicit no-infinite-loops and cost-awareness requirements; a task that can never succeed but retries indefinitely has genuinely unbounded cost exposure. **Raw, unvalidated output pass-through between agent steps.** Rejected — this is the challenge's first named trap: a malformed intermediate result silently propagating into a later step makes failures far harder to diagnose and can produce a confidently wrong final result rather than a clearly failed one, violating the graceful-degradation requirement.

### Chosen Design

An explicit step graph (a sequence, or a simple DAG for tasks with genuine branching) with schema validation on every step's output before use; checkpointing of validated output after each successful step; hard, explicit ceilings on total steps, per-step retries, and total elapsed time/cost, with escalation to a human or a clean, informative failure once any ceiling is reached.

### Implementation Walkthrough

```python
@dataclass
class Step:
    name: str
    agent: Callable[..., Awaitable[Any]]
    output_schema: type[BaseModel]
    max_retries: int = 2

class TaskLimits:
    max_total_steps: int = 20
    max_elapsed_seconds: int = 300

async def execute_task(goal: str, steps: list[Step], task_id: str, checkpoint_store) -> dict:
    start_time = time.monotonic()
    context: dict = {"goal": goal}
    resumed_from = await checkpoint_store.get_last_checkpoint(task_id)
    start_index = resumed_from["step_index"] + 1 if resumed_from else 0
    if resumed_from:
        context.update(resumed_from["context"])           # RESUME, don't restart from step 1

    for i, step in enumerate(steps[start_index:], start=start_index):
        if i >= TaskLimits.max_total_steps:                # HARD ceiling, no exceptions
            return {"status": "failed", "reason": "max_steps_exceeded", "trace": context}
        if time.monotonic() - start_time > TaskLimits.max_elapsed_seconds:
            return {"status": "failed", "reason": "time_budget_exceeded", "trace": context}

        for attempt in range(step.max_retries + 1):
            try:
                raw_output = await step.agent(context)
                validated = step.output_schema.model_validate(raw_output)   # SCHEMA CHECK before use
                context[step.name] = validated.model_dump()
                await checkpoint_store.save(task_id, i, context)             # CHECKPOINT on success
                log_step_trace(task_id, step.name, attempt, "succeeded")
                break
            except (AgentError, ValidationError) as exc:
                log_step_trace(task_id, step.name, attempt, "failed", str(exc))
                if attempt == step.max_retries:
                    return {"status": "escalated", "reason": f"{step.name}_exhausted_retries",
                            "trace": context}                                 # bounded retry, then stop

    return {"status": "succeeded", "result": context}
```

`resumed_from`/`start_index` mean a failure at step 7 resumes execution from step 7 on the next attempt (using the checkpointed context from steps 1-6), never redoing already-successful work — directly closing the challenge's third named trap. `output_schema.model_validate(raw_output)` validates every step's output before it's used as input to any later step, closing the first named trap. `TaskLimits.max_total_steps` and `max_elapsed_seconds`, checked unconditionally on every loop iteration, are hard ceilings with no bypass — closing the second and fourth named traps together, since even a task cycling through many individually-fast "successful" steps without converging will still hit `max_total_steps`.

### Production Improvements

Add a per-task running-cost accumulator (summing actual measured cost per agent call, not just step count) and check it against a budget ceiling alongside the step and time limits, since some agent calls may cost meaningfully more than others and step count alone doesn't fully capture cost-awareness. Expose the full `context` trace (which step ran, with what input/output, at what attempt number) via a dedicated observability endpoint, directly satisfying the observability requirement for debugging and for building user trust in the system's behavior.

### Scaling Path

Individual agent calls scale using the same per-dependency resilience patterns as Project 07's API Gateway (timeouts, circuit breakers per agent type); the checkpoint store scales as an ordinary key-value or document store keyed by task ID, with no coordination required across concurrently-running, independent tasks.

### Interview Discussion

A multi-agent orchestration question tests whether a candidate recognizes that chaining autonomous steps compounds failure risk multiplicatively, and specifically whether they propose hard, enforced ceilings rather than "the agents should generally converge" as an implicit, unstated assumption — see Python Backend Engineering Handbook §67's circuit-breaker chapter for the same fail-fast-rather-than-degrade-silently philosophy applied here at the multi-step-orchestration level instead of the single-external-call level.

### Lessons Learned

The core lesson is that autonomy and boundedness are not in tension — a genuinely useful multi-agent system needs *both* the flexibility to decompose and chain steps *and* hard, non-negotiable ceilings on how far that chaining can run before requiring human involvement. This same tension, and its resolution via explicit numeric limits rather than optimistic assumptions, is the defining engineering theme carried forward into Project 18's even more open-ended production AI workspace.

---
