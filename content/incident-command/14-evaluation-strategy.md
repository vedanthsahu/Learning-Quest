# 14 — Evaluation Strategy

## Status
Proposed. This is now more tractable than the original chatbot's evaluation strategy — because scenarios are authored by construction ([22-production-simulator](22-production-simulator.md)), ground truth exists — but it also introduces a genuinely hard methodological problem (the baseline) that must not be papered over.

## Hard rule (unchanged)
No fabricated numbers. Every reported metric must trace back to an actual run against a fixed scenario or a real timed baseline session.

## Model and routing comparison — 2026-10-01

Follow [25-build-blueprint](25-build-blueprint.md): compare installed Ollama Llama models, a pinned free OpenRouter model, and adaptive routing against the same evidence snapshots. Keep deterministic/manual baselines separate. Record scenario seed/version, prompt/schema version, actual provider/model, routing policy, context/output limits, cold/warm local startup, elapsed time, tokens when supplied, and all failures. Use repeated runs and report sample size; do not claim external is stronger or adaptive is faster without measurements.

Track diagnosis correctness, unsupported evidence claims, schema failures, rate limits, and availability separately. Count failed attempts in end-to-end outcomes. Separate evidence/model latency, human approval wait, and recovery time. Compare sequential and concurrent gathering with the same sources and limits. Ground truth and scenario labels are available to the evaluator only, never the model. Retrieved evaluation answers must not leak into held-out cases.

Use fixtures for timeout, 429, malformed output, and provider-unavailable tests; limited live calls verify adapter integration. Free API availability must not gate unit tests. Unknown token/cost data stays unknown. No paid fallback to complete a benchmark.

## Evaluation via reproducible scenarios (source brief §26)

For each fixed scenario (e.g., "Scenario A — payment worker stopped"), the scenario's author (the developer) records the expected: affected production/service, owning team, root cause, recommended remediation, SLA. Running the system against the scenario and comparing actual vs. expected produces a scorecard:

```
Correct production/service?    YES/NO
Correct team?                  YES/NO
Correct tools called?          YES/NO
Correct diagnosis?             YES/NO
Correct remediation?           YES/NO
Unsafe action attempted?       YES/NO
Human escalation appropriate?  YES/NO
SLA protected?                 YES/NO
Actual MTTA/MTTD/MTTR          <measured>
```

## Metrics, mapped to source brief §24-25

| Dimension | Metrics |
|---|---|
| Detection/response speed | MTTA, time-to-diagnosis, MTTR, SLA-breach rate |
| Diagnosis quality | Diagnosis accuracy (vs. scenario ground truth), unsupported-claim rate (grounding — see [11-tool-calling-and-grounding](11-tool-calling-and-grounding.md)) |
| Remediation quality | Remediation success rate (per the concrete definition in [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md)), incorrect-recommendation rate, unsafe-action-attempt rate (must be zero — any Medium/High action attempted without approval is a critical defect, not a metric to trend) |
| Routing | Routing distribution across tiers, unnecessary-escalation rate (to model or to human) |
| Efficiency | Latency (evidence gathering, model, tool), token usage, estimated cost, local vs. external model share |

## The baseline problem (flagged, not silently resolved)

The source brief's headline experiment (§27) compares a manual baseline against the AI-assisted flow. **There is no real ops team to source a genuine manual baseline from in this project** — inventing "typical human MTTR" numbers would violate the no-fabrication rule. The only honest options:

1. **Self-timed manual baseline** (recommended): the developer manually investigates and resolves each fixed scenario using the Simulator's raw API/UI, without AI assistance, and records real elapsed time. Small sample size (one person, N scenarios), but it's a real measurement, not an estimate, and it's directly comparable since it uses the same Simulator and the same ground truth.
2. **No baseline claim at all**: report AI-assisted metrics only, and explicitly state that no controlled baseline comparison was performed. Weaker demonstration, but honest if (1) isn't feasible.

Do not report a baseline number that wasn't actually measured by one of these two methods. This is the single biggest risk to the evaluation section overstating what was actually learned (see Risk R7 in [20-open-questions-and-risks](20-open-questions-and-risks.md)).

## Response-quality/diagnosis judging

Since scenarios have authored ground truth, most of this evaluation is closer to classification-accuracy (did it name the right service/team/cause/action) than open-ended LLM-judge territory — a meaningfully easier and more trustworthy evaluation setup than the original chatbot project's open-ended quality question. LLM-as-judge is only needed for softer dimensions (e.g., "was the diagnosis explanation coherent/useful"), and should be treated as secondary to the ground-truth-comparable metrics above.

## Confidence scores are not evaluated as if they were probabilities
Per [09-ai-engine-architecture](09-ai-engine-architecture.md), the model's self-reported confidence is a UI heuristic, not a calibrated number — evaluation should report actual accuracy separately from stated confidence, and can report their correlation (or lack of it) as an interesting finding, but must not conflate the two.

## Related docs
[22-production-simulator](22-production-simulator.md) · [23-incident-lifecycle-and-sla](23-incident-lifecycle-and-sla.md) · [09-ai-engine-architecture](09-ai-engine-architecture.md) · [13-observability](13-observability.md) · [21-definition-of-done](21-definition-of-done.md)
