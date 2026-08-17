## 3. Running Containers on AWS: ECS & EKS

> **Decision Snapshot** — Tier 1 · Compute · Verdict: ECS for teams that want AWS-native container orchestration with the least operational overhead; EKS for teams that need genuine Kubernetes portability or already run Kubernetes elsewhere. Primary alternative: Lambda if the workload is short and event-driven; bare EC2 if you're not containerizing at all.

### One-Line Summary
Two ways to run containers on AWS at scale — ECS (AWS's own orchestrator) and EKS (managed Kubernetes) — both optionally running on Fargate (no EC2 instances to manage) or directly on EC2 (more control, often cheaper at steady scale).

### Category
Compute

### Tier
Tier 1

### What They Do
Both services solve the same core problem — running many containers across a fleet, restarting failed ones, rolling out new versions, and load-balancing traffic to healthy instances — but with different control planes. **ECS** is AWS's own, simpler orchestrator: task definitions, services, and clusters map directly onto AWS-native concepts, with less to learn but less portability. **EKS** runs an actual, standard Kubernetes control plane, managed by AWS — the same YAML, the same `kubectl`, the same ecosystem (Helm, operators, service mesh) that runs anywhere else Kubernetes runs. Both can run their containers on **Fargate** (serverless — AWS manages the underlying compute entirely) or on **EC2** (you manage a cluster of instances the containers run on, more control and often better steady-state economics).

### When Should I Use ECS
- You're AWS-only with no near-term multi-cloud or on-prem Kubernetes requirement.
- You want the least operational surface area — no Kubernetes control-plane concepts to learn, patch, or reason about.
- Your team doesn't already have Kubernetes expertise, and building it isn't the goal.

### When Should I Use EKS
- You need genuine portability — the same workload running on-prem, on another cloud, or migrating away from AWS someday.
- Your team already has Kubernetes expertise or existing Kubernetes-native tooling (Helm charts, custom operators, a service mesh) you want to keep using.
- You need a Kubernetes-specific ecosystem feature (a particular operator, CRD, or admission controller) with no AWS-native equivalent.

### When Should I NOT Use Either (Reach for Lambda Instead)
- The workload is short-lived and event-driven with genuinely bursty traffic — you'll pay for idle container capacity that Lambda would never charge you for.
- You don't yet have more than one or two services — the orchestration overhead (of either) isn't earning its cost yet; a single EC2 instance or Lambda function may be simpler and correct for the actual current scale.

### Common Real-World Use Cases
- Containerized microservices behind an ALB, one ECS/EKS service per microservice.
- Long-running backend APIs that don't fit Lambda's execution-time or state constraints.
- Batch/worker fleets consuming from SQS, scaled by queue depth.
- Multi-tenant platforms needing Kubernetes-native isolation primitives (namespaces, network policies) — EKS specifically.

### Typical Architecture
```
ALB → ECS Service (Fargate or EC2 launch type)
         ↓
   [Task] [Task] [Task] ...  (desired count, auto-scaled)
         ↓
   RDS / ElastiCache / DynamoDB

--- or, EKS ---

ALB (via AWS Load Balancer Controller) → Ingress → Service → Pods
                                                        ↓
                                              RDS / ElastiCache / DynamoDB
```
In both cases, container images live in **ECR** (Elastic Container Registry) — pushed by your CI pipeline, pulled by the cluster at deploy time; treat ECR as the default, not an afterthought, rather than pulling from a public registry in production.

### Important Concepts
- **Task definitions (ECS) / Pod specs (EKS)** — the declarative description of what container image, how much CPU/memory, and what environment/secrets a running unit gets.
- **Fargate vs. EC2 launch type** — Fargate removes instance management entirely (you specify CPU/memory per task, AWS runs it); EC2 launch type means you manage the underlying instance fleet yourself (often cheaper at steady, high scale, since you can use Reserved Instances/Savings Plans against it).
- **Service discovery and load balancing** — how one service finds another (Cloud Map for ECS, Kubernetes Services/DNS for EKS).
- **Health checks and rolling deployments** — both platforms replace unhealthy tasks/pods automatically and support rolling updates; understanding your specific health-check grace period is what prevents a slow-starting container from being killed before it's actually ready.
- **Horizontal scaling** — ECS Service Auto Scaling / Kubernetes Horizontal Pod Autoscaler, typically on CPU or a custom CloudWatch/Prometheus metric.
- **IAM roles for tasks/pods** — ECS task roles and EKS's IAM Roles for Service Accounts (IRSA) both give a running container its own scoped AWS permissions, distinct from the underlying EC2 instance's role — never fall back to a broad instance-level role shared by every container on a node.

### Security Considerations
Scope IAM permissions per task/pod (task roles / IRSA), never per-node — a compromised container should not inherit every other container's permissions on the same host. Use private subnets for tasks/pods with no direct internet exposure, routing outbound traffic through a NAT gateway and inbound only through the load balancer. For EKS specifically, Kubernetes RBAC is a genuinely separate permission system from IAM — both need to be configured correctly, and conflating "IAM says yes" with "the pod is actually authorized" is a common misunderstanding.

### Monitoring
Container Insights (CloudWatch) gives per-task/pod CPU, memory, and network metrics without needing a separate agent for basic visibility; alarm on task/pod restart counts specifically, since a container silently crash-looping can otherwise hide behind an aggregate "service is healthy" status. For EKS, Prometheus plus Grafana is the more Kubernetes-native path many teams already run alongside or instead of CloudWatch.

### Scaling
Both scale horizontally by adding tasks/pods (fast, seconds to a couple minutes) and, if on EC2 launch type, by adding underlying instances via an Auto Scaling Group (slower — new instance boot time is the bottleneck, which is exactly what Fargate or EC2 warm-pool strategies exist to avoid). The real ceiling is almost always a shared downstream dependency (a database), identical to the same lesson under EC2 (§1) and Lambda (§2).

### Cost Model
Fargate bills per vCPU/memory-second actually provisioned to running tasks — no idle-instance cost, but a per-unit premium versus running the same workload on EC2 you fully utilize. EC2 launch type bills for the underlying instances regardless of container packing efficiency, meaning bin-packing (running many containers per instance efficiently) is a direct, real cost lever. EKS additionally has a per-cluster-hour control-plane charge on top of whatever compute the pods run on (ECS's control plane is free).

### Common Mistakes
- Running every container on a shared, broad IAM role instead of per-task/pod roles.
- Under-provisioning CPU/memory requests, causing noisy-neighbor contention or throttling on a shared node.
- Choosing EKS for its ecosystem without budgeting the real, ongoing cost of Kubernetes operational expertise it requires.
- Pulling images from a public registry in the request path of a production deploy, introducing an external availability dependency.
- Forgetting a readiness probe / health-check grace period tuned to actual startup time, causing rolling deploys to kill slow-starting containers prematurely.

### Migration Path
**Outgrowing bare EC2**: this chapter *is* that migration path — containerizing onto ECS/EKS is the standard next step once you're managing more than a couple of services by hand. **Between ECS and EKS**: moving from ECS to EKS is usually driven by a genuine portability or ecosystem need, not a scale need — ECS scales to very large fleets on its own. **Downgrading**: a service that turns out to be genuinely short-lived/event-driven is better served by Lambda than by keeping it running (and being paid for) continuously in a container.

### Interview Questions
1. When would you choose ECS over EKS, and vice versa, for a new project?
2. What's the practical tradeoff between Fargate and the EC2 launch type?
3. How do IAM task roles (or IRSA on EKS) improve on a shared instance-level role?
4. What causes a rolling deployment to kill a container that was actually still starting up successfully?
5. Why might running the exact same workload on EKS cost more than on ECS?
6. How would you design service-to-service communication within a single cluster?
7. What's the difference between Kubernetes RBAC and IAM, and why do you need both configured correctly on EKS?
8. How do you decide when a workload is a better fit for Lambda than for either ECS or EKS?
9. What's bin-packing, and why does it matter for cost on the EC2 launch type?
10. How would you debug a container that's crash-looping but the service still reports "healthy" overall?

### Python Example
```python
import boto3

ecs = boto3.client("ecs", region_name="us-east-1")

# Register a task definition with a per-task IAM role (never a shared broad role)
# and explicit CPU/memory reservations for predictable bin-packing.
ecs.register_task_definition(
    family="order-service",
    requiresCompatibilities=["FARGATE"],
    networkMode="awsvpc",
    cpu="512",
    memory="1024",
    taskRoleArn="arn:aws:iam::123456789012:role/order-service-task-role",
    executionRoleArn="arn:aws:iam::123456789012:role/ecs-execution-role",
    containerDefinitions=[{
        "name": "order-service",
        "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/order-service:latest",
        "portMappings": [{"containerPort": 8000}],
        "logConfiguration": {
            "logDriver": "awslogs",
            "options": {
                "awslogs-group": "/ecs/order-service",
                "awslogs-region": "us-east-1",
                "awslogs-stream-prefix": "order-service",
            },
        },
    }],
)
```
`taskRoleArn` is scoped specifically to this one service's actual AWS permissions — distinct from `executionRoleArn`, which only covers what ECS itself needs (pulling the image, writing logs), directly implementing the per-task IAM isolation discussed above rather than falling back on a broad, shared role.

### Best Practices
- Default to ECS unless you have a specific, real reason for EKS's added operational surface.
- Scope IAM per task/pod, always.
- Push images to ECR from CI; never pull from a public registry in production.
- Tune health-check grace periods to real container startup time before enabling aggressive rolling deploys.
- Right-size CPU/memory requests based on actual measured usage, not guesses.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Managed Container Orchestration | ECS | Azure Container Apps / ACI | Cloud Run |
| Managed Kubernetes | EKS | AKS | GKE |
| Container Registry | ECR | Azure Container Registry | Artifact Registry |

---
