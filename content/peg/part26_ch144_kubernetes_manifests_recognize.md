## §144. Kubernetes Manifests You Should Recognize

### 1. The Vocabulary

- **Deployment** — declares the desired state for a set of pods (which image, how many replicas,
  resource limits); Kubernetes continuously works to make actual state match it.
- **Service** — a stable network identity (a DNS name and virtual IP) in front of a changing set of
  pods, so other things in the cluster don't need to track individual pod IPs, which change
  constantly.
- **Ingress** — routes external HTTP(S) traffic into the cluster to the correct Service based on
  hostname/path rules — the Kubernetes-native equivalent of a reverse proxy/API gateway config.
- **ConfigMap and Secret** — hold non-sensitive and sensitive configuration respectively, injected
  into pods as environment variables or mounted files, kept separate from the container image
  itself.
- **HPA (Horizontal Pod Autoscaler)** — automatically adjusts the number of running pod replicas
  based on observed metrics like CPU or memory usage.

### 2. Where It Sits, and Why Teams Use It

These five objects are the ones you'll see referenced constantly in any Kubernetes-based system,
and recognizing what each does — even without deep operational Kubernetes expertise — is exactly
the "common knowledge" level this book targets. The core idea underlying all of them: you declare
*desired* state in a manifest, and a set of controllers continuously reconciles *actual* state
(which pods are really running, right now) to match it — you don't imperatively tell Kubernetes
"start this container," you declare "there should be 3 of these running" and it handles the rest,
including replacing pods that crash.

### 3. What Actually Breaks

- **Confusing desired state with actual state** — a Deployment saying "3 replicas" doesn't mean 3
  are healthy right now; checking actual pod status separately (`kubectl get pods`) is necessary to
  know what's really running versus what's merely declared.
- **Secrets stored as plain ConfigMap values** — a common early mistake; Secrets exist as a
  separate object specifically because they receive different (though still not perfect) handling
  — base64 encoding is not encryption, and real secret management often still needs an external
  secrets manager (§146) behind it.
- **A Service with no matching pod labels** — Services select pods by label selector; a typo or
  mismatch here means the Service exists but silently routes to nothing.
- **No resource limits set on a Deployment** — a pod with no memory/CPU limit can consume far more
  than intended, potentially starving other pods on the same node — a real, common cause of
  "unrelated" pods becoming slow or getting evicted.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "A Deployment declares desired state — how many replicas, which image — and Kubernetes
  reconciles actual pods to match it; that's different from actually checking what's running."
- "A Service gives a stable address in front of pods that come and go, and an Ingress routes
  external traffic to the right Service based on hostname or path."
- "I know Secrets are a separate object from ConfigMaps, but base64 encoding isn't encryption —
  real secret protection usually needs more than the Secret object alone."

### 5. Interview-Ready Answer

> "I can read and reason about the core manifests even without deep day-to-day Kubernetes
> operations experience: a Deployment declares desired pod state and Kubernetes reconciles actual
> state to match it, a Service gives that changing set of pods a stable address, an Ingress routes
> external traffic to the right Service, and ConfigMaps/Secrets hold configuration separately from
> the image. I know an HPA can scale replica count automatically based on load, and I know that
> 'desired state says 3 replicas' isn't the same fact as '3 healthy pods are running right now.'"

### 6. Go Deeper

Neither companion book has a Kubernetes-dedicated chapter separate from container orchestration
generally (companion Cloud Engineering Playbook's §3, Running Containers on AWS: ECS & EKS, is the
closest); companion DSA Engineering Handbook's §50 (Kubernetes: Heaps, Work Queues & the
Scheduler) chapter covers the scheduler/reconciliation loop specifically, in depth; this book's
§20 (Kubernetes basics) and §56 (autoscaling delay) for adjacent coverage.

---
