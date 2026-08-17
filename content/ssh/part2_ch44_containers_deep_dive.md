## 44. Containers Deep Dive: Namespaces, cgroups, Image Layers, Container Runtime

### 44.1 What This Chapter Adds to §14

§14 established that a container is a lighter-weight isolation mechanism built on ordinary OS processes, packaging an application with its runtime environment. This chapter opens up the two specific Linux kernel features that make this possible, and how container images are actually structured and run.

### 44.2 Namespaces: Giving a Process Its Own Apparently-Private View

A **namespace** is a kernel feature that gives a process (or group of processes) its own isolated view of some global system resource, such that it cannot see or affect anything outside that view. Different namespace types isolate different resources:

- **PID namespace**: a process inside the namespace sees only its own process tree, typically believing itself to be process ID 1 — it cannot see, and cannot send signals to, any process outside its namespace.
- **Network namespace**: a process gets its own private network interfaces, IP addresses, and routing table, isolated from the host's real network configuration.
- **Mount namespace**: a process sees its own private filesystem view, so mounting or unmounting a filesystem inside the namespace doesn't affect (and isn't visible to) the host or other containers.
- **UTS namespace**: a process can have its own hostname, independent of the host machine's actual hostname.

A container is, at its foundation, an ordinary Linux process launched with a specific combination of these namespaces active — there is no separate "container" kernel object; the isolation is entirely composed from these general-purpose namespace primitives, which is precisely why containers can start so much faster and use so much less overhead than a full virtual machine (§14.2): no new kernel or hardware virtualization is involved, only a process given a restricted view of resources the single, shared kernel already manages for everyone.

### 44.3 cgroups: Bounding How Much of a Resource a Process May Use

Where namespaces control *what a process can see*, **control groups (cgroups)** control *how much of a resource a process (or group of processes) may actually consume* — CPU time, memory, disk I/O bandwidth, network bandwidth. A cgroup can cap a container's memory usage, for instance, such that if the container's processes attempt to exceed that cap, the kernel intervenes (commonly by killing a process within the group, the well-known **OOM-killed container** scenario) rather than allowing it to consume memory that other containers or the host itself need. This is the concrete mechanism that makes it safe to run many containers on one shared host without one misbehaving or resource-hungry container starving the others — directly analogous to the bulkhead pattern from §42.4, now enforced by the kernel itself at the resource-allocation level rather than by application-level connection-pool partitioning.

### 44.4 Image Layers: Why Container Images Build and Share Efficiently

A container image is not a single, monolithic blob — it is built as a stack of **layers**, each representing a set of filesystem changes (files added, modified, or removed) relative to the layer beneath it, typically corresponding to one instruction in the image's build definition (a `Dockerfile`, for instance). When a container actually runs, these read-only layers are combined (via a union filesystem) into what looks like one coherent filesystem, with a final, writable layer added on top to capture any changes the running container itself makes — changes that disappear when the container is removed, unless explicitly persisted elsewhere.

```
Image layers (read-only, stacked, shared across images):

  Layer 3: [ application code ]
  Layer 2: [ language runtime + dependencies installed ]
  Layer 1: [ base OS filesystem ]
           ------------------------------------------------
  Container's writable layer (ephemeral, per-container instance)

Two different images that both start from the same base OS
layer (Layer 1) can SHARE that layer on disk and over the
network -- it only needs to be stored and transferred once,
not once per image.
```

This layering has two direct, practical consequences: building images incrementally (changing only the top-most layers when application code changes, while dependency layers beneath remain unchanged) makes rebuilds and image transfers fast, since only changed layers need to be rebuilt or re-transferred; and because a container's own writes live only in its ephemeral top layer, any data a container needs to persist beyond its own lifetime must be explicitly stored outside the container (in a mounted volume, or an external service) — a direct, concrete instance of the statelessness principle from §18.5, now enforced structurally by the image/container model itself.

### 44.5 The Container Runtime: What Actually Sets Up Namespaces and cgroups

The **container runtime** (e.g., `runc`, invoked under the hood by Docker or Kubernetes) is the component that actually performs the low-level work described in §44.2-44.3: reading an image's layers, setting up the appropriate namespaces and cgroup limits, and starting the containerized process within that constructed environment. Higher-level tools (Docker, Kubernetes' container runtime interface) build on top of this low-level runtime to provide image management, networking configuration, and orchestration (§45) — but the actual isolation and resource-bounding, at the moment a container starts, is namespace and cgroup setup performed by this comparatively small, focused runtime component, not something the higher-level tooling implements itself.

### 44.6 Common Mistakes and Production Debugging Signals

- Storing important data inside a container's writable layer with no external volume, and losing that data the moment the container is restarted or rescheduled — a direct consequence of not respecting §44.4's ephemeral-writable-layer model.
- Failing to set an appropriate memory cgroup limit, allowing one container to consume enough host memory to trigger thrashing (§25.3) or starve other containers on the same host, rather than being cleanly OOM-killed itself within its own bounded allocation.
- Building container images without attention to layer ordering (e.g., copying frequently-changing application code before installing rarely-changing dependencies), causing every build to invalidate and rebuild far more layers than necessary, and every deploy to transfer far more data than needed (§44.4).

### 44.7 Engineering Intuition

> **How do I know a container's resource limits are inadequate?** OOM-killed containers appearing in logs/orchestrator events; one container's resource usage visibly affecting the performance of unrelated containers on the same host.
>
> **What symptoms indicate a data-persistence mistake?** Data unexpectedly disappearing specifically after a container restart or rescheduling event — the signature of data having been stored in the ephemeral writable layer (§44.4) rather than an external volume.
>
> **What metrics indicate it?** Per-container memory/CPU usage against its configured cgroup limits; image build time and transferred layer size trending upward disproportionately to actual code changes (a layer-ordering inefficiency, §44.4).
>
> **What breaks first if resource limits aren't set?** A single runaway or misbehaving container can degrade or crash every other container sharing its host, defeating the isolation containers are otherwise expected to provide.
>
> **When do you not need to think about this level of detail?** Day-to-day application development against an already-configured container platform rarely requires reasoning about namespaces or cgroups directly — this depth matters for writing efficient Dockerfiles, diagnosing resource-related container failures, and understanding orchestrator behavior (§45).
>
> **What would a hyperscale company do?** Enforce resource limits and image-layering best practices via mandatory build pipelines and platform policy, rather than leaving them to individual teams' discretion, given the blast-radius risk of one team's misconfigured container affecting shared infrastructure.
>
> **What would a two-person startup do?** Use reasonable default resource limits from their platform/hosting provider and structure their Dockerfile with basic layer-ordering hygiene (dependencies before application code), without deep customization.
>
> **What changes with scale?** At a small number of containers on generously-sized hosts, loose resource limits rarely cause visible problems. As container density per host increases (a direct cost-efficiency motivation at scale), correctly-tuned cgroup limits become essential to prevent one container's misbehavior from degrading many others (§69).

### 44.8 Exercises

1. A container is restarted after a routine deployment, and data written to its local filesystem during its previous run has vanished. Using §44.4, explain precisely why, and what change would prevent this going forward.
2. Explain, using §44.2-44.3, why a container is fundamentally "just a process" from the host kernel's perspective, and what this implies about how quickly a container can start compared to a full virtual machine.

### 44.9 Further Reading

- Liz Rice, *Container Security* — an accessible, implementation-level treatment of namespaces, cgroups, and the container runtime underlying this chapter.
- Michael Kerrisk, *The Linux Programming Interface* — the authoritative, exhaustive reference on Linux namespaces and cgroups at the systems-programming level.

---
