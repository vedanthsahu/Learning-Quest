## §16. Server vs VM vs Container vs Process

### 1. The Vocabulary

- **Physical server** — actual hardware.
- **Virtual machine (VM)** — a full emulated computer (its own kernel) running on shared
  hardware, managed by a hypervisor.
- **Container** — an isolated process (or group of processes) sharing the host's kernel, with its
  own filesystem/network view — much lighter than a VM.
- **Process** — a single running program; a container typically runs one main process (or a small
  handful), a VM can run many.

### 2. Where It Sits, and Why Teams Use It

This is a spectrum of isolation vs. overhead: a VM gives the strongest isolation (separate
kernel) at the highest resource cost; a container gives good-enough isolation for most workloads
at a fraction of the overhead, which is why containers became the default deployment unit for
most backend services.

### 3. What Actually Breaks

- **Assuming a container is "basically a tiny VM"** — containers share the host kernel; a kernel-
  level vulnerability or a `sudo`-style container escape can affect the host in a way a real VM
  boundary would have prevented. The isolation is real but weaker than a VM's.
- **Running multiple unrelated services in one container "to save resources"** — defeats the
  point of containerization (one concern per container) and makes health checks, restarts, and
  logs ambiguous about which internal thing actually failed.
- **Confusing "container restarted" with "container is unhealthy but still running"** — a process
  can be alive and still failing every request; a restart doesn't help, only a proper health
  check catches it (§9).

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "A container shares the host kernel; a VM has its own — that's the core tradeoff between
  container density/speed and VM isolation strength."
- "I run one primary process per container, not a bundle of unrelated services."
- "Container restarted" and "container healthy" are different questions — a crash loop and a
  silently-broken-but-running process need different diagnosis.

### 5. Interview-Ready Answer

> "The practical difference is what's shared. A VM virtualizes hardware and runs its own full
> kernel, so two VMs on the same host are strongly isolated from each other. A container shares
> the host kernel and just isolates the process's view of the filesystem and network, which is
> much cheaper and faster to start, at the cost of a slightly weaker isolation boundary. For most
> backend services, that tradeoff is worth it, which is why containers are the default deployment
> unit today."

### 6. Go Deeper

companion Software Systems Handbook's §14 (Mental Model: Containers & Kubernetes) chapter and
companion Software Systems Handbook's §44 (Containers Deep Dive: namespaces, cgroups, image
layers) chapter (namespaces, cgroups, runtime internals).

---
