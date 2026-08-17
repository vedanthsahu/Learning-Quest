## 55. Why Did My ECS/EKS Deployment Fail or Degrade?

*(Prerequisite: companion §3 ECS/EKS)*

### 55.1 Symptoms
A rolling deployment stalls, rolls back automatically, or results in a service running fewer healthy tasks/pods than expected — sometimes with brief, user-visible error-rate spikes during the deployment window specifically.

### 55.2 Possible Causes
A new container image failing to start at all (a bad build, a missing environment variable/secret); a container starting but failing its health check because the health-check grace period is shorter than the application's actual startup time; insufficient cluster capacity (no room to schedule new tasks/pods alongside old ones during a rolling deployment); a resource limit (CPU/memory) set too low for the new version's actual requirements, causing throttling or out-of-memory kills.

### 55.3 Metrics
Task/pod restart counts during the deployment window; `HealthyHostCount`/`UnhealthyHostCount` at the ALB target group level (companion §10) specifically during the rollout; CPU/memory utilization approaching configured limits for the new task definition/pod spec.

### 55.4 Logs
Container logs from the specific failing task/pod (via CloudWatch Logs for ECS, or `kubectl logs`/Container Insights for EKS) almost always show the actual failure directly — an application-level startup error, a missing configuration value, or an out-of-memory kill signature — and should be the very first place to look, before broader infrastructure-level investigation.

### 55.5 Investigation
Check container logs for the specific failing task/pod first — this resolves the majority of deployment failures directly (a startup error is usually explicit in the logs). If containers start but are marked unhealthy, compare the health-check grace period against the application's actual, measured startup time. If containers are healthy but get killed, check for an out-of-memory signature against the configured memory limit.

### 55.6 Root Cause
In practice, the most common causes are: a health-check grace period shorter than real startup time (causing a rolling deployment to kill containers that were actually still starting up successfully, directly companion §3's own named Common Mistake), and a missing or incorrect environment variable/secret reference in the new task definition/pod spec that only surfaces once the new version actually tries to start.

### 55.7 Fix
Tune the health-check grace period to comfortably exceed real, measured application startup time. Validate new task definitions/pod specs (environment variables, secret references, resource limits) in a staging environment identical to production before rolling out, catching configuration errors before they reach a production rollout. Right-size CPU/memory requests based on actual measured usage of the new version, not the previous version's requirements assumed to still apply.

### 55.8 Tradeoffs
A longer health-check grace period means a genuinely unhealthy container takes longer to be detected and replaced — a real tradeoff against faster failure detection, tuned to actual startup time rather than either extreme. Provisioning more headroom capacity for rolling deployments (so new and old tasks/pods can coexist during rollout) costs more standing compute, worth it specifically to avoid deployments stalling due to insufficient scheduling room.

### 55.9 Prevention
Test deployments in a staging environment matching production's configuration before every production rollout. Set health-check grace periods based on measured, not assumed, startup time. Ensure the cluster has headroom capacity for a rolling deployment's temporary coexistence of old and new versions.

### 55.10 Decision Tree
```
Check the specific failing task/pod's container logs directly:
  Shows an explicit application startup error -> Fix the underlying config/code
     issue; the deployment failure is a symptom, not the root cause.
  No error, container just gets killed/restarted -> Compare health-check grace
     period against actual measured startup time; also check for OOM-kill signatures
     against the configured memory limit.
  Containers healthy individually, but deployment stalls -> Check cluster capacity
     for headroom to schedule new tasks/pods alongside old ones during rollout.
```

---
