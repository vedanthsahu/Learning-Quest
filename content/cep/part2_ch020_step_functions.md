## 20. Step Functions

> **Decision Snapshot** — Tier 2 · Orchestration · Verdict: the default choice for a multi-step workflow needing visible state, retries, and error handling across steps — especially once a single Lambda would otherwise exceed its 15-minute limit or need hand-rolled orchestration logic. Primary alternative: orchestrating manually within a single Lambda/application if the workflow is genuinely simple and short.

### One-Line Summary
A visual, state-machine-based orchestrator for multi-step workflows — sequencing Lambda calls, other AWS service integrations, waits, and parallel branches, with built-in retry and error handling per step.

### Category
Orchestration

### Tier
Tier 2

### What It Does
Step Functions defines a workflow as a state machine (in Amazon States Language, a JSON-based format, though CDK/Terraform can generate it) — a sequence of states (a Lambda invocation, a wait, a choice/branch, a parallel fan-out, direct AWS service calls) with explicit transitions between them. Each state can have its own retry policy and error handling, and the entire execution's history is visible and inspectable — exactly the visibility a hand-rolled orchestration-via-chained-Lambda-invocations approach doesn't give you for free.

### When Should I Use It?
- A workflow with more than two or three sequential steps, especially if any step can fail and needs a specific retry/fallback policy.
- A process exceeding what a single Lambda's 15-minute timeout comfortably allows (companion §2).
- Workflows needing human-approval steps, long waits (hours/days), or parallel fan-out/fan-in across many items.

### When Should I NOT Use It?
- A genuinely simple, one-or-two-step process where the orchestration overhead (learning the state machine language, the added per-transition cost) isn't earning its keep — a single Lambda function is simpler and sufficient.
- Extremely high-throughput, low-latency internal calls where Step Functions' per-state-transition cost and latency matters more than its visibility/retry benefits.

### Common Real-World Use Cases
- Multi-step order-fulfillment or onboarding workflows (validate → charge → provision → notify), each step with its own retry policy.
- Data processing pipelines with fan-out (process many files in parallel) and fan-in (aggregate results).
- Long-running approval workflows (a human review step that may take hours/days before the workflow continues).

### Typical Architecture
```
Start → [Validate Order] → [Choice: valid?]
                                ↓ yes                    ↓ no
                        [Charge Payment]           [Notify: Rejected]
                                ↓ (retry 3x on transient failure)
                        [Provision Resources]
                                ↓
                        [Send Confirmation] → End
```
Each arrow in this diagram is a Step Functions state transition — critically, each individual step (Charge Payment, Provision Resources) can have its own independent retry/backoff/catch configuration, which is exactly the granularity a single monolithic Lambda function trying to do all of this itself would have to hand-roll.

### Important Concepts
- **Standard vs. Express workflows** — Standard workflows support executions up to a year long, exactly-once execution semantics, and full execution history visibility; Express workflows are optimized for high-volume, short-duration workloads (up to 5 minutes) at much lower cost, with at-least-once semantics.
- **States** — Task (do something, e.g., invoke Lambda), Choice (branch), Wait, Parallel (fan-out), Map (iterate over a collection, run a sub-workflow per item), Succeed/Fail.
- **Retry and Catch** — per-state configuration for automatic retry (with backoff) on specific error types, and Catch for routing to a fallback state on failure that exhausts retries.
- **Service integrations** — Step Functions can call many AWS services directly (not just Lambda) — DynamoDB, SNS, SQS, ECS, and others — sometimes removing the need for a Lambda function to exist purely as a thin wrapper around another AWS API call.

### Security Considerations
Scope the state machine's execution role narrowly to exactly the services/actions its states actually invoke — the same least-privilege discipline as any other IAM role (companion §16). Be mindful that execution input/output (visible in the execution history) can include sensitive data by default; avoid passing genuinely sensitive values through workflow state directly where a reference/lookup would do.

### Monitoring
CloudWatch metrics for `ExecutionsFailed`/`ExecutionsTimedOut`/`ExecutionsAborted` at the state-machine level, plus the built-in execution history UI (or API) for inspecting exactly which state a specific failed execution stopped at and why — a genuinely faster diagnostic path than reconstructing the equivalent from scattered Lambda logs across a hand-rolled orchestration.

### Scaling
Standard workflows scale to a large number of concurrent executions automatically; Express workflows are specifically designed for very high-volume, high-throughput scenarios (thousands of executions per second) at correspondingly lower per-execution cost. The practical constraint is usually a specific downstream service's own throughput (a Lambda concurrency limit, a database), not Step Functions itself.

### Cost Model
Standard workflows bill per state transition; Express workflows bill per execution duration and memory consumed (similar in shape to Lambda's own pricing) — for high-volume, short workflows, Express is typically dramatically cheaper, which is exactly why the choice between the two matters as a genuine cost decision, not just a technical one.

### Common Mistakes
- Defaulting to Standard workflows for a high-volume, short-duration use case where Express would be both cheaper and a better fit.
- Not scoping the retry/backoff policy per state to that specific step's actual failure characteristics, applying one generic retry policy everywhere.
- Passing sensitive data directly through workflow input/output instead of a reference looked up by the consuming state.
- Building a workflow so simple it didn't need Step Functions' overhead at all — the reverse mistake, reaching for orchestration before a genuine multi-step, stateful need exists.

### Migration Path
**From hand-rolled orchestration**: the natural direction is chained Lambda invocations or manual polling logic migrating *into* Step Functions once retry/visibility/long-duration needs outgrow what ad hoc code comfortably provides. **Downgrading**: a workflow that turns out to be genuinely simple (one or two steps, no complex retry needs) might reasonably move back to a single Lambda function.

### Interview Questions
1. What's the practical difference between Standard and Express Step Functions workflows?
2. How does per-state retry/catch configuration improve on a single Lambda handling its own retry logic internally?
3. When would you choose to call a service directly from a Step Functions state versus wrapping it in a Lambda function?
4. What's the Map state, and what problem does it solve for processing a collection of items?
5. Why might Step Functions' execution history be more valuable during an incident than reconstructing an equivalent flow from Lambda logs?
6. What's a concrete workflow shape where you'd choose Express over Standard, and why?

### Python Example
```python
import json

# A Step Functions state machine definition (Amazon States Language) with per-state
# retry policy -- Charge Payment retries transient failures 3x with backoff before
# falling through to a Catch that routes to a compensating/notification state.
definition = {
    "StartAt": "ValidateOrder",
    "States": {
        "ValidateOrder": {"Type": "Task", "Resource": "arn:aws:lambda:...:validate-order", "Next": "ChargePayment"},
        "ChargePayment": {
            "Type": "Task",
            "Resource": "arn:aws:lambda:...:charge-payment",
            "Retry": [{"ErrorEquals": ["PaymentGatewayTimeout"], "IntervalSeconds": 2, "MaxAttempts": 3, "BackoffRate": 2.0}],
            "Catch": [{"ErrorEquals": ["States.ALL"], "Next": "NotifyPaymentFailed"}],
            "Next": "ProvisionResources",
        },
        "ProvisionResources": {"Type": "Task", "Resource": "arn:aws:lambda:...:provision", "Next": "SendConfirmation"},
        "SendConfirmation": {"Type": "Task", "Resource": "arn:aws:lambda:...:notify", "End": True},
        "NotifyPaymentFailed": {"Type": "Task", "Resource": "arn:aws:lambda:...:notify-failure", "End": True},
    },
}
```
The `Retry` block on `ChargePayment` specifically targets `PaymentGatewayTimeout` (a transient, retry-appropriate error) with exponential backoff, while `Catch` handles the case retries are exhausted by routing to a distinct failure-notification state — this per-state granularity is exactly what a single Lambda function attempting the same multi-step logic would otherwise have to reimplement by hand.

### Best Practices
- Use Express workflows for high-volume, short-duration executions; Standard for long-running or exactly-once-sensitive workflows.
- Configure retry/catch per state, matched to that step's actual failure modes — not one generic policy for everything.
- Use direct service integrations where they remove the need for a thin Lambda wrapper.
- Avoid passing sensitive data through workflow state directly.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Workflow Orchestration | Step Functions | Azure Logic Apps / Durable Functions | Workflows |

---
