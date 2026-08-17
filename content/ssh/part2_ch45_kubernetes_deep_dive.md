## 45. Kubernetes Deep Dive: Pods, Scheduler, Controllers, Services, Ingress, Operators

### 45.1 What This Chapter Adds to §14.3-14.4

§14.3-14.4 established Kubernetes' core idea: declare desired state, and a controller continuously reconciles reality toward it. This chapter covers the concrete objects that make this work — pods, the scheduler, controllers, and the networking objects (services, ingress) that expose running containers.

### 45.2 Pods: The Smallest Deployable Unit, Not a Single Container

Kubernetes does not schedule individual containers directly — its smallest deployable unit is a **pod**, a group of one or more containers that are always scheduled together, onto the same machine, sharing the same network namespace (§44.2) and, optionally, storage volumes. Most pods run a single application container, but the multi-container option exists specifically for tightly-coupled helper processes (a **sidecar**, exactly as introduced in §42.3's service mesh discussion, or a logging/metrics-shipping agent) that need to run alongside the main container and share its network identity directly, rather than communicating with it over the ordinary network. Understanding "pod," not "container," as the actual unit of scheduling and networking is essential to reasoning correctly about Kubernetes networking and co-location behavior.

### 45.3 The Scheduler: Deciding Which Machine Runs Which Pod

When a new pod is declared, the **scheduler** decides which node (machine) in the cluster should run it, based on the pod's declared resource requirements (CPU, memory — directly informing the cgroup limits from §44.3), any explicit placement constraints (e.g., "must run on a node with a GPU," or "must not run on the same node as another specific pod, for redundancy"), and the current resource availability across all nodes. This is a direct, concrete instance of the "declarative, not imperative" principle from §14.4: you declare the pod's requirements, not the specific machine, and the scheduler continuously makes and revises that placement decision as cluster conditions change — including rescheduling a pod onto a different, healthy node automatically if the node it was running on fails.

### 45.4 Controllers: The Reconciliation Loops That Make Declarative Management Real

A **controller** is the actual software process implementing the "continuously reconcile reality toward the declared desired state" behavior described conceptually in §14.4. Each controller watches for a specific type of resource and continuously compares its current, observed state against its declared, desired state, taking action to close any gap.

```
Controller reconciliation loop (conceptual, applies to
essentially every Kubernetes controller):

    loop forever:
        desired_state = read from the declared resource spec
        actual_state  = observe the real, current cluster state
        if actual_state != desired_state:
            take action to move actual_state closer to desired_state
        wait briefly, then repeat
```

A **Deployment** controller, for instance, is given a desired pod count and a container image version; it continuously ensures that many pods running that image actually exist, creating new ones if some have crashed (directly delivering the self-healing behavior promised in §14.4) and orchestrating a gradual, controlled replacement of old pods with new ones when the declared image version changes (a **rolling update**, one of the concrete deployment strategies previewed in §15.3 and developed further in §46). The critical conceptual point: nearly everything Kubernetes does is one of these reconciliation loops, running continuously and independently for many different resource types simultaneously — there is no single central "orchestrator brain" making one-off decisions, only many independent controllers each relentlessly re-converging their own small piece of desired state.

### 45.5 Services: Stable Networking Identity for a Set of Ever-Changing Pods

Pods are frequently created and destroyed (by rolling updates, by the scheduler rescheduling after a node failure, by autoscaling), each time potentially receiving a new internal IP address — which makes directly addressing "a specific pod" an unstable, unreliable way for other components to find it. A **Service** provides a stable network identity (a fixed internal DNS name and IP) in front of a dynamically-changing set of pods, using a continuously-updated label selector to determine which current pods should receive traffic sent to that stable identity, and load-balancing across them (directly reusing the load-balancing concepts from §28, now applied at the cluster-internal networking layer). This is precisely the mechanism that makes the horizontally-scaled, stateless architecture described in §18.4-18.5 practical within Kubernetes: callers address a stable Service, entirely insulated from the constantly-changing underlying pod population.

### 45.6 Ingress: Routing External Traffic Into the Cluster

Where a Service provides stable addressing *within* the cluster, an **Ingress** resource (typically backed by a controller running an actual reverse proxy/load balancer, per §28.2's L7 concept) manages how external, outside-the-cluster traffic is routed in — commonly routing based on hostname or URL path to different internal Services, directly analogous to the API gateway role described in §42.2, but implemented as a Kubernetes-native, declaratively-configured resource rather than a separately-operated piece of infrastructure. Many production clusters use Ingress specifically as their implementation of the API gateway pattern, unifying external routing configuration with the same declarative, version-controlled approach (§15.4's Infrastructure as Code principle) used for every other Kubernetes resource.

### 45.7 Operators: Extending Controllers to Application-Specific Operational Knowledge

An **Operator** is a custom controller (§45.4) built to encode the operational knowledge needed to run a specific, often stateful application correctly — not just "keep N replicas running" (which a standard Deployment controller already does), but application-specific logic like "when scaling this database cluster, add replicas in this specific order, wait for each to finish data synchronization before proceeding, and never remove the current leader without first triggering a leader election." Operators exist because generic Kubernetes controllers know nothing about a specific application's operational requirements — running a stateless web server safely is a solved, generic problem (§45.4), but running a stateful, replicated database safely (§8, §34, §36) requires domain-specific operational logic that an Operator packages into the same declarative, "define desired state and let a controller reconcile it" model used for everything else in the cluster.

### 45.8 Common Mistakes and Production Debugging Signals

- Treating individual pod IP addresses as stable and addressing them directly rather than through a Service (§45.5), producing intermittent connectivity failures every time the scheduler reschedules a pod for any reason.
- Under-declaring a pod's resource requirements, causing the scheduler to place more pods on a node than it can actually sustain under real load, leading to cgroup-level resource contention (§44.3) and unpredictable performance once traffic actually arrives.
- Running a genuinely stateful application (a database, a message queue) using only a standard Deployment controller with no Operator or equivalent stateful-workload-specific logic (§45.7), producing data loss or corruption during routine scaling or node-failure events that a stateless Deployment handles gracefully but a naive stateful one does not.

### 45.9 Engineering Intuition

> **How do I know if a workload needs a custom Operator rather than a standard Deployment?** If scaling, upgrading, or recovering the workload safely requires application-specific sequencing or coordination (not just "start more identical, independent copies"), a standard Deployment controller's generic logic is insufficient.
>
> **What symptoms indicate a Service/pod-addressing mistake?** Intermittent connectivity errors correlating with pod restarts or rescheduling events, rather than any genuine change in the receiving application's health.
>
> **What metrics indicate a scheduling/resource-declaration problem?** Node-level resource utilization significantly exceeding the sum of pods' declared resource requests, or frequent pod evictions due to node resource pressure.
>
> **What breaks first if resource requests are inaccurate?** The scheduler makes placement decisions based on incorrect information, potentially overcommitting a node and causing broad performance degradation across every pod on it once real load arrives, not just the under-declared one.
>
> **When is plain Kubernetes (no service mesh, no custom Operators) sufficient?** For the large majority of stateless application workloads, standard Deployments, Services, and Ingress resources are entirely sufficient — Operators and service meshes (§42.3) are additional sophistication justified only by genuinely stateful workloads or genuinely large service counts, respectively.
>
> **What would a hyperscale company do?** Build or adopt Operators for every significant stateful component they run on Kubernetes, enforce accurate resource requests via policy and monitoring, and treat Ingress/Service configuration as rigorously reviewed, version-controlled infrastructure (§69).
>
> **What would a two-person startup do?** Run simple, stateless workloads via standard Deployments and Services, use managed database services (§43.4) rather than running their own stateful workloads on Kubernetes at all, sidestepping the need for custom Operators entirely.
>
> **What changes with scale?** At a small number of straightforward, stateless workloads, Kubernetes' generic controllers handle everything needed. As stateful, application-specific operational complexity and overall cluster scale grow, custom Operators and more sophisticated scheduling/resource policies become necessary to keep operations safe and consistent (§69).

### 45.10 Exercises

1. A pod is rescheduled onto a new node after its original node fails, receiving a new internal IP address in the process, and a hard-coded client configuration referencing the old IP starts failing. Using §45.5, explain the correct fix.
2. Explain, using §45.4's reconciliation loop, why a Deployment controller can safely and automatically recover from a pod crash without any human intervention, and what specific desired-state declaration makes that recovery possible.

### 45.11 Further Reading

- Kelsey Hightower, Brendan Burns, Joe Beda, *Kubernetes: Up and Running* — a practitioner-oriented treatment of pods, controllers, Services, and Ingress in real operational detail.
- The Kubernetes Operator Pattern (official Kubernetes documentation) and the CNCF Operator Framework — the authoritative reference for §45.7's Operator concept.

---
