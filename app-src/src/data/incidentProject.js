// Stable IDs keep saved progress attached to a task when copy/order changes.
const task = (id, title, outcome, checks, docs) => ({ id, title, outcome, checks, docs });
export const INCIDENT_PROJECT_ID = 'incident-command';
export const milestones = [
  { id: 'foundation', title: 'Reproduce the foundation', subtitle: 'Make the existing system repeatable.', tasks: [
    task('local-startup', 'Start the local workspace', 'A documented startup sequence brings the four services and data stores online.', ['Choose and record Windows or WSL startup commands', 'Verify PostgreSQL on port 5433 and configure the MinIO bucket', 'Verify React, Spring Boot, AI engine and simulator health'], ['25-build-blueprint.md', '07-system-architecture.md', '18-deployment-strategy.md']),
    task('persistence', 'Prove persistence and migrations', 'Incidents survive restart and tests use their own database.', ['Apply Flyway migrations to an empty test database', 'Create an incident and verify it survives a restart', 'Record database configuration without credentials'], ['08-data-architecture.md', 'adr/ADR-004-postgresql.md']),
    task('scenario-baseline', 'Record Scenario A end to end', 'One worker failure creates one incident with an SLA clock and a diagnosis.', ['Record scenario seed and failure start time', 'Verify ownership, severity, deadline and duplicate prevention', 'Capture evidence and the existing Ollama diagnosis in the UI'], ['22-production-simulator.md', '23-incident-lifecycle-and-sla.md', '09-ai-engine-architecture.md']),
  ] },
  { id: 'safe-slice', title: 'Close the recovery loop', subtitle: 'Build the first complete, safe demonstration.', tasks: [
    task('authorization', 'Enforce production-scoped access', 'Users can only view and act within their assigned productions.', ['Verify authentication at the backend', 'Test allowed and unassigned users against read and action APIs', 'Authenticate service calls; keep simulator writes backend-only'], ['15-security-and-rbac.md', '07-system-architecture.md']),
    task('grounding', 'Connect claims to evidence', 'A diagnosis exposes observations, hypotheses and missing information.', ['Assign source, timestamp and ID to evidence', 'Validate diagnosis structure and referenced evidence IDs', 'Keep scenario ground truth out of model context'], ['11-tool-calling-and-grounding.md', '09-ai-engine-architecture.md']),
    task('approval', 'Implement an approval gate', 'An operator approves the exact registered action before it can execute.', ['Bind approval to action, arguments, target, incident version and expiry', 'Reject unauthorized, rejected, changed or expired requests', 'Persist idempotency; duplicate requests do not repeat a write'], ['11-tool-calling-and-grounding.md', '25-build-blueprint.md']),
    task('recovery', 'Verify recovery and export a report', 'A successful action is followed by fresh health checks and a clear outcome.', ['Execute restart_service through Spring Boot', 'Resolve only after telemetry meets recovery criteria', 'Record action/timeline and export to MinIO without undoing resolution on export failure'], ['23-incident-lifecycle-and-sla.md', '21-definition-of-done.md', 'adr/ADR-007-s3.md']),
  ] },
  { id: 'models', title: 'Connect free model routes', subtitle: 'Local Ollama and one verified external provider.', tasks: [
    task('ollama-inventory', 'Qualify installed Llama models', 'Select a local model from actual installed tags and measured behavior.', ['Record installed Ollama tags and chosen model', 'Measure cold/warm latency and schema compliance', 'Verify local-only mode makes no external inference requests'], ['adr/ADR-009-local-model-strategy.md', '25-build-blueprint.md']),
    task('openrouter', 'Implement the OpenRouter adapter', 'The same evidence can be investigated using a selected free model.', ['Replace the existing adapter stub and keep keys server-side', 'Verify and allowlist a specific free model ID', 'Normalize structured output and provider/model metadata'], ['adr/ADR-010-api-cloud-model-strategy.md', '09-ai-engine-architecture.md']),
    task('provider-failures', 'Make model failures understandable', 'Investigation stays bounded and evidence remains available when inference fails.', ['Test timeout, 429, malformed output and unavailable-model fixtures', 'Bound all attempts by deadline and invocation limit', 'Return an incomplete outcome without paid fallback or retry loops'], ['12-concurrency-and-efficiency.md', '25-build-blueprint.md']),
  ] },
  { id: 'measure', title: 'Measure, then improve', subtitle: 'Let evidence justify routing and concurrency.', tasks: [
    task('model-comparison', 'Compare local and external baselines', 'Repeated runs use identical evidence and report failures honestly.', ['Pin scenario, prompt, schema and model versions', 'Measure correctness, unsupported claims, latency and availability', 'Record sample size and unknown usage/cost as unknown'], ['14-evaluation-strategy.md']),
    task('adaptive-routing', 'Add rule-based adaptive routing', 'The route is selected using task needs and measured model behavior.', ['Use context size, capabilities, latency, quota and remaining time', 'Show routing reason and fallback history', 'Compare adaptive against the single-model baselines'], ['09-ai-engine-architecture.md', '25-build-blueprint.md']),
    task('concurrent-evidence', 'Bound concurrent evidence gathering', 'Independent evidence sources run concurrently with a measured comparison.', ['Capture the sequential baseline first', 'Add concurrency limits, per-source timeouts and partial-result reporting', 'Compare latency with identical sources and limits'], ['12-concurrency-and-efficiency.md', '13-observability.md']),
  ] },
  { id: 'memory', title: 'Expand the incident experience', subtitle: 'Learn from reviewed outcomes and cover more failures.', tasks: [
    task('retrieval', 'Add scoped incident memory', 'Reviewed runbooks and resolved incidents can be retrieved safely.', ['Select and version an embedding model and dimensions', 'Index reviewed sources in pgvector with timestamps', 'Test production filtering and stale/untrusted context handling'], ['10-memory-architecture.md', 'adr/ADR-006-milvus.md']),
    task('scenarios', 'Implement Scenarios B–E', 'Bad deployment, DB saturation, dependency timeout and intermittent failure are repeatable.', ['Record seed and evaluator-only ground truth for each scenario', 'Exercise diagnosis and permitted recovery paths', 'Keep held-out answers out of retrieval and prompts'], ['22-production-simulator.md', '14-evaluation-strategy.md']),
    task('notifications', 'Add in-app SLA warnings', 'The assigned operator can see new incidents and one escalation tier.', ['Notify the assigned production/team on incident creation', 'Implement one SLA-percentage warning tier', 'Prevent duplicate warnings and test deadline edge cases'], ['23-incident-lifecycle-and-sla.md', '04-must-have-vs-good-to-have.md']),
  ] },
  { id: 'demo', title: 'Package a credible demonstration', subtitle: 'Make it reproducible for someone new.', tasks: [
    task('traces', 'Expose the investigation timeline', 'One trace connects browser, backend, engine, simulator and model calls.', ['Propagate correlation IDs across service calls', 'Show evidence, model, action and recovery timings', 'Exclude keys and sensitive payloads from telemetry'], ['13-observability.md', '16-ui-product-and-design-spec.md']),
    task('evaluation', 'Publish a reproducible scorecard', 'Results link to real runs and separate model time, human wait and recovery.', ['Run fixed scenarios with versioned configuration', 'Capture a real manual baseline or state it was not measured', 'Report failures, limitations and actual outcomes'], ['14-evaluation-strategy.md', '21-definition-of-done.md']),
    task('handoff', 'Run the demo from the setup guide', 'A fresh setup can reproduce the safe incident lifecycle.', ['Document configuration templates and startup commands', 'Exercise failure → diagnosis → approval → recovery', 'Record known gaps against the definition of done'], ['02-sow.md', '21-definition-of-done.md', '25-build-blueprint.md']),
  ] },
  { id: 'cloud', title: 'Explore AWS deliberately', subtitle: 'Optional experiments after the matching local gate.', optional: true, tasks: [
    task('cloud-budget', 'Verify account and experiment budget', 'A scoped cloud experiment has current credit, cost and teardown information.', ['Verify personal account, MFA and current credit expiry', 'Configure budget visibility and record the experiment scope', 'Write rollback and teardown instructions'], ['18-deployment-strategy.md', '24-aws-prerequisites-setup-guide.md']),
    task('cloud-data', 'Validate S3 and RDS separately', 'Proven local storage contracts also work remotely.', ['Verify scoped S3 report upload/read', 'Verify RDS connectivity, migrations and restart persistence', 'Run matching acceptance checks and document cleanup'], ['19-aws-strategy.md', '24-aws-prerequisites-setup-guide.md']),
    task('cloud-demo', 'Evaluate remote simulator and hosting', 'A budgeted remote demonstration retains authorization and traceability.', ['Verify authenticated EC2 simulator access and network failures', 'Provide authenticated HTTPS backend access before hosting the frontend', 'Document hosting comparison; keep Bedrock and email experiments separately budgeted'], ['18-deployment-strategy.md', '19-aws-strategy.md']),
  ] },
];

export const allTasks = milestones.flatMap(m => m.tasks);
export function taskComplete(task, state = {}) {
  return state.status === 'done' && task.checks.every((_, i) => state.checks?.[i]);
}
export function projectSummary(progress = {}) {
  const core = milestones.filter(m => !m.optional).flatMap(m => m.tasks);
  const done = core.filter(t => taskComplete(t, progress[t.id])).length;
  return { done, total: core.length, percent: Math.round(done / core.length * 100), next: core.find(t => !taskComplete(t, progress[t.id])) };
}
