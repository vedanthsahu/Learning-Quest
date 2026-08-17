## Project 18: Production AI Workspace — Solution Guide

### Business Reasoning

The business need is turning seventeen independently-designed projects into one coherent, trustworthy, multi-tenant product. The defining engineering risk of integration work specifically — as distinct from any single subsystem's own design risk — is that each subsystem being individually correct does not guarantee the integrated whole is correct; new risks emerge specifically at the seams between subsystems, and this project's entire purpose is finding and closing those seams.

### Requirements Analysis

Multi-tenant isolation is the requirement with zero acceptable tolerance — a failure here doesn't degrade the product, it breaches customer trust in a way that's very difficult to recover from. This requirement, more than any other in the entire series, demands defense in depth: not one check that, if correct, protects everything, but independent enforcement at every subsystem's own boundary, so that no single bug anywhere is sufficient to cause a cross-tenant leak.

### Architecture

```
Every request/job carries a tenant_id, propagated through:
  API Gateway (outer check) -> Search/RAG (tenant_id in EVERY query, per Projects 8/14/15's pattern)
  -> Copilot session state (tenant_id in session key) -> Multi-Agent checkpoints (tenant_id in checkpoint key)
  -> Metrics/cost tracking (tenant_id as a mandatory tag on every emitted metric and cost record)
Each subsystem's OWN data-access layer independently enforces tenant_id filtering -- never relying
solely on the outer gateway check having already handled it.
```

### Tradeoff Discussion

**Single outer-edge tenant check vs. defense-in-depth enforcement at every subsystem.** A single check at the API gateway is simpler to implement and reason about in isolation, but makes the *entire* system's tenant isolation dependent on that one check never having a bug, and on every internal code path actually routing through the gateway (a background job triggered by another background job, for instance, might not). Defense-in-depth (each subsystem independently re-verifies tenant scoping at its own data-access layer) is more implementation effort, repeated across every subsystem, but means a single bug anywhere is contained rather than catastrophic — directly matching the zero-tolerance nature of the isolation requirement.

**Assuming integrated correctness from individually-correct subsystems vs. explicit integration testing.** Trusting that seventeen individually-verified subsystems compose correctly is faster to ship but ignores that integration introduces genuinely new failure modes (a tenant ID correctly enforced in Project 15's RAG retrieval but never actually threaded into Project 17's multi-agent checkpoint store it now depends on, for instance). Explicit, dedicated integration testing — specifically probing the seams between subsystems, not re-testing each subsystem's already-proven individual correctness — catches exactly this class of bug, at the cost of real, additional testing effort focused specifically on integration paths.

### Alternative Designs Considered and Rejected

**Relying solely on an API-gateway-level tenant check.** Rejected — this is the challenge's first named trap: it makes every internal subsystem's safety entirely contingent on one component and one code path, with no independent safety net if that assumption is ever violated (a direct background-job trigger bypassing the gateway, a bug in the gateway's own check). **Treating cost tracking as a future addition rather than a day-one integration requirement.** Rejected — this is the challenge's second named trap: given the genuinely variable, usage-driven cost of the AI-heavy subsystems (Projects 15-17), deferring cost attribution means the business has no visibility into a cost risk that's actively accruing from day one of production use.

### Chosen Design

A `tenant_id` threaded explicitly through every request, background job, checkpoint, and metric across all integrated subsystems, with each subsystem's own data-access layer (not just the outer gateway) independently enforcing tenant scoping; per-tenant cost attribution recorded at the point of every expensive call; a dedicated integration test suite specifically targeting the seams between subsystems; zero-downtime migration and staged rollout discipline applied consistently across the whole integrated system, not independently reinvented per subsystem.

### Implementation Walkthrough

```python
@dataclass
class TenantContext:
    tenant_id: str

tenant_ctx: contextvars.ContextVar[TenantContext] = contextvars.ContextVar("tenant_ctx")

@app.middleware("http")
async def tenant_middleware(request: Request, call_next):
    tenant_id = resolve_tenant_from_auth(request)          # outer-edge check
    tenant_ctx.set(TenantContext(tenant_id))
    return await call_next(request)

# EVERY subsystem's data-access layer independently re-checks tenant_id -- defense in depth,
# not trust in the outer check alone (closes the challenge's first named trap):

async def search_documents(query: str, session: AsyncSession) -> list[DocumentModel]:
    tenant_id = tenant_ctx.get().tenant_id
    stmt = (
        select(DocumentModel)
        .where(DocumentModel.tenant_id == tenant_id)        # RE-ENFORCED here, not assumed from caller
        .where(DocumentModel.search_vector.match(query))
    )
    return list((await session.execute(stmt)).scalars())

async def enqueue_agent_task(task_id: str, steps: list, checkpoint_store) -> None:
    tenant_id = tenant_ctx.get().tenant_id
    await checkpoint_store.save(f"{tenant_id}:{task_id}", 0, {})   # tenant_id IN the checkpoint key

def record_cost(operation: str, cost_usd: float) -> None:
    tenant_id = tenant_ctx.get().tenant_id
    metrics_client.emit("operation_cost_usd", cost_usd,
                         tags={"tenant_id": tenant_id, "operation": operation})   # per-tenant, day one

async def call_llm_with_cost_tracking(prompt: str, llm_client) -> str:
    result = await llm_client.complete(prompt)
    record_cost("llm_call", estimate_cost(prompt, result))    # threaded into EVERY AI-heavy call site
    return result
```

`tenant_ctx` (a `contextvars.ContextVar`, following the same correlation-ID propagation pattern as Python Backend Engineering Handbook §64.3 and §90.4) makes tenant identity available throughout a request's full call chain, including into background tasks when explicitly passed along — but critically, `search_documents` re-checks `tenant_id` at its own query level rather than trusting that only correctly-scoped calls ever reach it, directly implementing defense-in-depth and closing the first named trap. `record_cost`, called from every AI-heavy operation's call site (not just LLM calls — search and agent steps would follow the identical pattern), directly closes the second named trap by making cost attribution a day-one, structural part of every expensive operation rather than a later addition.

### Production Improvements

Build a dedicated per-tenant "prove isolation" report — a query, run periodically, confirming zero cross-tenant references exist anywhere across the integrated data model — directly answering the reflection question about proving isolation convincingly to a security-conscious customer, with actual evidence rather than a design claim alone. Add per-tenant cost budgets with alerting (reusing this series' Project 12 metrics platform) so an unexpectedly expensive usage pattern is caught proactively, not discovered at billing time.

### Scaling Path

Each integrated subsystem continues to scale using its own project-specific scaling path (Projects 1-17 each already established one); the addition here is that scaling decisions must now account for per-tenant fairness — a single large tenant's usage spike should not degrade service for other tenants sharing the same infrastructure, which may require per-tenant rate limiting (Project 02's pattern, applied per-tenant rather than per-API-key) on the most expensive, shared subsystems.

### Interview Discussion

A "design a multi-tenant SaaS platform" question at senior level almost always tests whether a candidate treats isolation as a single-point check or as a defense-in-depth property enforced at every layer — this project, and this solution's explicit rejection of the single-outer-check design, is the direct, concrete answer to that exact test.

### Lessons Learned

The core lesson closing this entire series is that integrating many individually-correct systems is its own distinct engineering discipline, with its own failure modes (seam bugs, inconsistent enforcement, cost blind spots) that don't exist in any single subsystem alone — and that the same disciplines this series has taught throughout (atomic operations, authorization at the query level, bounded costs, honest tradeoff analysis) apply recursively at the integration level, not just within each individual project. Every engineering habit built across Projects 1-17 — stating tradeoffs honestly, enforcing correctness structurally rather than by convention, bounding cost and risk explicitly — is, in the end, what makes Project 18's integration achievable at all.

---
