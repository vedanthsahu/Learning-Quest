## §20. Kubernetes Basics: Pods, Deployments, and Probes

### 1. The Vocabulary

- **Pod** — the smallest deployable unit; one or more tightly-coupled containers sharing network
  and storage.
- **Deployment** — declares "I want N replicas of this pod running," and Kubernetes continuously
  works to make that true.
- **Service** — a stable network endpoint in front of a changing set of pods.
- **Ingress** — routes external HTTP(S) traffic into services, based on host/path (Kubernetes'
  version of an API gateway/L7 router).
- **Readiness probe** — "is this pod ready to receive traffic right now?"
- **Liveness probe** — "is this pod still healthy, or should it be restarted?"

### 2. Where It Sits, and Why Teams Use It

Kubernetes automates exactly the things §9 and §17 described manually — health-checking,
restarting, and routing around unhealthy instances — at the scale of an entire cluster instead of
one load balancer's target group.

### 3. What Actually Breaks

- **Confusing readiness and liveness** — a failing readiness probe takes the pod *out of the
  service's routing* without restarting it (useful for "still starting up" or "temporarily
  overloaded"); a failing liveness probe *restarts the pod*. Using the wrong one for the wrong
  situation causes either unnecessary restarts or traffic sent to a pod that isn't ready.
- **No graceful shutdown handling** — Kubernetes sends a termination signal and gives a grace
  period before force-killing a pod; an app that doesn't handle that signal to finish in-flight
  requests gets those requests abruptly dropped, identical to the connection-draining problem in
  §9.
- **Pod restarting in a loop (`CrashLoopBackOff`)** — same underlying causes as any crash loop
  (§17), just with Kubernetes' own backoff and status naming on top.
- **Resource limits set too low** — a pod that gets killed for exceeding its memory limit looks
  like a random crash unless you specifically check for an OOM-kill event.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Readiness controls traffic routing; liveness controls restarts — they answer different
  questions and shouldn't share the exact same check without thinking about it."
- "My app needs to handle a graceful shutdown signal to finish in-flight work before Kubernetes
  force-kills it."
- "`CrashLoopBackOff` just means Kubernetes' own name for a crash loop — the actual root cause is
  found the same way as any other crash loop, by looking at logs from before the crash."

### 5. Interview-Ready Answer

> "Kubernetes automates what a load balancer's health checks do, but at cluster scale: a
> Deployment keeps a target number of pod replicas running, a Service gives them a stable
> endpoint, and readiness/liveness probes decide whether a pod should receive traffic versus be
> restarted entirely. The distinction that trips people up is that readiness failing just pulls a
> pod out of rotation, while liveness failing actually restarts it — using the same check for
> both can cause unnecessary restarts during a pod that's just temporarily busy."

### 6. Go Deeper

companion Software Systems Handbook's §45 (Kubernetes Deep Dive: pods, scheduler, controllers,
ingress) chapter (scheduler, controllers, operators in full); companion Cloud Engineering
Playbook's §3 (Running Containers on AWS: ECS & EKS) chapter.

---
