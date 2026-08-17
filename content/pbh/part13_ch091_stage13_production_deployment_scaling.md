## 91. Stage 13: Production Deployment & Scaling

### 91.1 Stage Goal

Every mechanism Fieldnote needs now exists. This closing stage assembles it into an actual deployable system, applies companion §69.4's full pre-production readiness checklist against everything built across §79-90, and establishes the scaling path for each independent component — the last stage before §92's retrospective looks back across the whole capstone.

### 91.2 New Requirements

Non-functional only: the system must survive a single instance failure in any tier (web, Celery worker) without full downtime; each tier must be independently scalable, since §90's observability work has already revealed (§90.6) that web-tier and worker-tier load patterns are genuinely different and shouldn't be assumed to scale together.

### 91.3 ADR-13: Independent Scaling Per Tier vs. One Combined Deployable Unit

**(1) Deciding:** Should the web tier and Celery workers be deployed and scaled as one combined unit, or as independently scalable deployments? **(2) Options considered:** (a) one container image and one deployment running both the web process and a Celery worker process together; (b) two separate deployments — a web deployment and a worker deployment — each with its own, independently configured replica count. **(3) Tradeoffs:** A combined deployment is simpler to operate (one thing to deploy, one thing to scale) but forces web and worker capacity to scale in lockstep even though §85-86 already showed their load patterns differ (request volume versus queue depth) — over-provisioning one tier to satisfy the other's actual need; independent deployments let each tier's replica count track its own actual demand, at the cost of two separate deployment configurations and two separate health-check definitions (companion §85.6's already-noted distinction between "accepting requests" and "pulling tasks from the queue") to maintain. **(4) Chosen:** Independent deployments — this is the direct, natural conclusion of every scaling-relevant observation made since §85, not a new consideration introduced only now; deploying them as one combined unit at this point would actively contradict what §90's own metrics have already shown about how differently these two tiers actually behave under load. **(5) Revisit when:** Never expected to reverse under Fieldnote's trajectory — like ADR-9 (§87.3), included to show a decision this capstone's own accumulated evidence makes close to unconditional, not merely convenient.

### 91.4 Implementation

```yaml
# web-deployment.yaml (companion §69.2's multi-stage Dockerfile, deployed independently)
replicas: 3
readinessProbe:            # companion §66.3 -- "can this pod accept traffic"
  httpGet: {path: /health/ready, port: 8000}
livenessProbe:              # companion §66.2 -- "should this pod be restarted"
  httpGet: {path: /health/live, port: 8000}

---
# worker-deployment.yaml -- a SEPARATE deployment, scaled on queue depth, not request rate
replicas: 2
livenessProbe:              # companion §85.6 -- "is this worker still pulling tasks", not HTTP-based
  exec: {command: ["celery", "-A", "fieldnote", "inspect", "ping"]}
```

```python
# A startup readiness check specifically for Fieldnote (companion §69.6's pattern, applied)
async def verify_fieldnote_readiness(settings, engine, redis_client) -> list[str]:
    issues = []
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    try:
        await redis_client.ping()
    except redis.RedisError:
        issues.append("Redis is unreachable at startup")
    if not object_storage.bucket_exists(settings.attachments_bucket):
        issues.append(f"Attachments bucket {settings.attachments_bucket} does not exist")
    return issues
```

The web deployment's `readinessProbe` and `livenessProbe` target genuinely different endpoints with genuinely different meanings (companion §66.2-66.3) — a pod failing readiness stops receiving new traffic without being killed (appropriate for a pod still warming up or briefly overloaded), while failing liveness triggers a restart (appropriate only for a pod that's genuinely stuck). The worker deployment's liveness check uses a Celery-native `inspect ping` rather than an HTTP endpoint, since a worker process has no HTTP server to check at all — directly reflecting §85.6's point that a worker's health is a fundamentally different question than a web pod's.

### 91.5 What Changed in the Architecture

Fieldnote now has two independently deployed, independently scaled units where §79-90 always implicitly assumed (and, until §85, literally required) a single running process — the final, largest structural change in the capstone, and one only possible because every prior stage's background-work boundary (§84's `BackgroundTasks` call sites, then §85's Celery task boundaries) was already cleanly isolated rather than tangled into the request-handling code directly.

### 91.6 Production Considerations

Run `verify_fieldnote_readiness` (or equivalent) against every one of companion §69.4's checklist categories specifically for Fieldnote's own actual dependency list (PostgreSQL, Redis, the Celery broker, object storage, the LLM provider) — a generic checklist reviewed in the abstract is less useful than the same checklist worked through concretely, dependency by dependency, exactly as this implementation does.

### 91.7 Debugging

**Symptoms:** After splitting into independent deployments (§91.3), notifications (§86) are delayed significantly more than before the split, even though nothing about the notification code itself changed. **Investigation:** Check the worker deployment's replica count against actual queue depth under current load (companion §85.6) — a common mistake immediately after this kind of split is provisioning worker replica count based on a guess rather than the queue-depth metric §90.4 already instruments, undersizing the newly-independent worker tier relative to what the combined deployment had implicitly been providing all along.

### 91.8 Mini Lab

Deliberately terminate one of the three web replicas while running a load test against Fieldnote, and confirm — using the readiness/liveness distinction from §91.4 — that traffic continues to be served by the remaining replicas without a user-visible interruption, directly verifying §91.2's single-instance-failure survival requirement rather than only assuming the Kubernetes-level configuration achieves it.

---
