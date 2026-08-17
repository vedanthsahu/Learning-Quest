## §143. Container Deployment on AWS: Dockerfile to ECR to ECS/EKS

### 1. The Vocabulary

- **ECR (Elastic Container Registry)** — AWS's Docker image registry; you build an image locally
  or in CI, tag it, and push it here before any AWS compute service can run it.
- **ECS (Elastic Container Service)** — AWS's own container orchestrator; a **task definition**
  describes the container(s), a **service** keeps a desired number of tasks running, and a
  **target group** behind an **ALB** routes traffic to them.
- **EKS (Elastic Kubernetes Service)** — managed Kubernetes on AWS; the same core Kubernetes
  objects apply (§144) — Deployment, Service, Ingress, ConfigMap, Secret — with AWS managing the
  control plane.
- **Task definition vs Deployment manifest** — ECS's task definition and EKS's Deployment manifest
  play the same conceptual role (what to run, how many, with what resources) in each system's own
  format.

### 2. Where It Sits, and Why Teams Use It

The end-to-end path is the same shape regardless of which orchestrator you land on: build the
image, tag it (usually with a commit SHA or version, not just `latest`), push it to a registry,
then tell an orchestrator to run it. ECS is the simpler, more AWS-native choice — less to learn,
tightly integrated with ALB/IAM/CloudWatch. EKS is the choice when a team already knows Kubernetes,
needs its portability across clouds, or needs the ecosystem of Kubernetes-native tools.

### 3. What Actually Breaks

- **Tagging every image `latest`** — makes it impossible to know which exact code is actually
  running, and makes rollback ambiguous ("roll back to *which* latest?"); tag with a commit SHA or
  semantic version instead.
- **No health check configured on the target group** — the ALB keeps sending traffic to a task
  that's up but not actually ready to serve requests, producing user-visible errors during
  deploys or after a partial crash.
- **IAM permissions attached to the wrong place** — an ECS task needs its *task role* (not the EC2
  instance role, if running on EC2-backed ECS) scoped correctly, a frequent source of confusing
  "why can't my container reach S3" issues.
- **No rolling deployment or rollback plan** — deploying a new task definition that immediately
  crash-loops, with no automatic rollback configured, can take an entire service down instead of
  failing one task at a time.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I tag images with a commit SHA, never just `latest`, so I always know exactly what's deployed
  and can roll back to a specific, known-good version."
- "I configure real health checks on the target group so the load balancer stops routing traffic
  to a task before it's actually ready, and stops immediately if it becomes unhealthy."
- "I know ECS and EKS solve the same problem at different levels of AWS-native simplicity versus
  Kubernetes-ecosystem portability."

### 5. Interview-Ready Answer

> "The path is build the image, tag it with something traceable like a commit SHA, push to ECR,
> then deploy — either an ECS task definition and service behind an ALB with a target group and
> real health checks, or an EKS Deployment/Service/Ingress if the team is already Kubernetes-native.
> I always make sure health checks are actually meaningful, not just 'process is running,' since
> that's what lets rolling deploys and rollbacks work safely instead of routing traffic to
> not-actually-ready containers."

### 6. Go Deeper

companion Cloud Engineering Playbook's §3 (Running Containers on AWS: ECS & EKS) chapter for full
deployment-pipeline examples; this book's §13-14 (Docker images/registries, deployment strategies)
and §20 (Kubernetes basics) for the adjacent build and rollout mechanics.

---
