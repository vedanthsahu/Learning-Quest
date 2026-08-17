## 43. Cloud Primitives Deep Dive: Compute, Storage, Managed Databases, Networking

### 43.1 What This Chapter Adds to §13

§13 established the cloud as rented, adjustable infrastructure with relocated responsibility. This chapter covers the concrete categories of service a cloud provider actually offers, and the specific engineering tradeoffs within each category.

### 43.2 Compute: VMs, Containers-as-a-Service, and Serverless Functions

Along the management spectrum introduced in §13.4, compute offerings span from **virtual machines** (you manage the OS and everything above it, with full control but full operational responsibility) through **managed container platforms** (you supply a container image, per §14, and the platform handles placement and scaling) to **serverless functions** (you supply only application code for a single function/handler; the platform manages everything else, including deciding how many instances to run and when, often scaling to zero when idle). The engineering-relevant consequence of serverless's "scale to zero" behavior is **cold starts**: when no instance is currently running, the platform must provision one from scratch before it can handle a request, adding latency to that first request that does not affect subsequent ones served by the now-warm instance. This is why serverless compute is well suited to spiky, unpredictable, or low-average-utilization workloads (where paying only for actual execution time is a large win) and less well suited to latency-sensitive workloads with a hard requirement on consistent, low response times unless the cold-start risk is explicitly managed (e.g., via minimum warm-instance settings, at the cost of giving back some of serverless's cost advantage).

### 43.3 Storage: Block, Object, and File — Three Different Access Models

- **Block storage** presents raw, fixed-size blocks of data, exactly like a physical disk attached directly to a machine — the natural fit for a database's own data files, which expect low-level, direct control over how data is laid out and accessed.
- **Object storage** presents whole, opaque objects (a file, a blob) addressed by a key, accessed over HTTP-style APIs rather than a filesystem interface, with effectively unlimited scale and durability handled entirely by the provider, at the cost of not supporting the fine-grained, in-place partial updates a block device or filesystem allows — updating part of a large object generally means rewriting the whole object.
- **File storage** presents a traditional, shared filesystem interface (directories, files, POSIX-like semantics) accessible from multiple machines simultaneously — useful specifically when multiple compute instances need concurrent, shared access to the same mutable files, a need neither block storage (attached to one machine at a time, typically) nor object storage (no real in-place mutation) directly serves.

Choosing among these is a direct match to actual access pattern, in the same spirit as §7.5's database-model decision: a database's own storage wants block storage; a large archive of user-uploaded images wants object storage; a legacy application expecting a shared network filesystem wants file storage — and using the wrong one (e.g., storing a database's data files on object storage) either doesn't work at all or performs far worse than the matched alternative.

### 43.4 Managed Databases: Buying Back §6-9's Operational Burden

A **managed database** service handles the operational burden this handbook has spent several chapters describing — replication (§34), backups, patching, and often automated failover — as part of the service, in exchange for less low-level control (and, per §13.4's spectrum, less ability to tune storage-engine-level parameters directly, §31) than self-hosting the same database software would provide. For the majority of applications, this trade is heavily favorable: the operational expertise required to run a production-grade, correctly-replicated, reliably-backed-up database (§8, §19, §34) is substantial, and a managed service amortizes that expertise across many customers rather than requiring each team to build it independently. The cases where self-hosting remains preferable are the same cases flagged generally in §13.6: extreme, sustained scale where the managed service's premium becomes a large absolute cost, or genuine need for storage-engine-level tuning the managed offering doesn't expose.

### 43.5 Networking Primitives: The VPC as a Private, Isolated Network

A **Virtual Private Cloud (VPC)** is a logically isolated slice of the cloud provider's network, within which you define your own private IP address ranges, subnets, and routing rules — giving you the same conceptual network topology control you'd have with physical, owned network hardware, without actually owning any of it. Resources within a VPC can communicate privately, without traversing the public internet, and access to and from the public internet is governed by explicit rules (security groups, network access control lists) that function as the concrete, enforceable implementation of the trust-boundary concept from §17.3 — nothing enters or leaves the VPC's trusted zone without passing through a rule you've explicitly defined, directly operationalizing "explicitly decide what you're willing to assume crosses this boundary" rather than leaving it to implicit, undocumented network reachability.

### 43.6 Common Mistakes and Production Debugging Signals

- Deploying a latency-sensitive, consistently-loaded service on serverless compute without accounting for cold starts (§43.2), producing a visible tail-latency problem specifically for requests that happen to hit a cold instance.
- Storing frequently, partially-updated data (like a database's own files) on object storage, fighting its whole-object-replacement model instead of using block storage, which is actually built for that access pattern (§43.3).
- Leaving default, overly permissive network rules in a VPC (§43.5), effectively skipping the explicit trust-boundary enforcement the VPC model exists to provide.

### 43.7 Engineering Intuition

> **How do I know which compute model fits a given workload?** Match the workload's actual traffic shape: steady, latency-sensitive traffic favors always-on VMs or container platforms; spiky, intermittent, latency-tolerant traffic favors serverless, accepting its cold-start tradeoff.
>
> **What symptoms indicate a storage-model mismatch?** Application code working unnaturally hard to simulate one storage model's semantics on top of another (e.g., re-implementing partial-update logic against object storage) — a strong sign the wrong storage category was chosen for the access pattern.
>
> **What metrics indicate a cold-start problem?** A bimodal latency distribution — a cluster of normal-latency requests and a distinct cluster of much higher latency ones — correlating with periods of low traffic followed by a sudden request, rather than a smooth, unimodal latency distribution.
>
> **What breaks first if managed services are avoided without reason?** Engineering time is spent operating undifferentiated infrastructure (patching, replication, backup verification) instead of building the product, a direct, ongoing opportunity cost per §13.5.
>
> **When is self-hosting a database or running raw VMs the right call over managed alternatives?** Only once a specific, measured requirement — extreme sustained cost at scale, or a genuine need for storage-engine-level control the managed tier doesn't expose — justifies the added operational burden (§13.6, §68).
>
> **What would a hyperscale company do?** Use a deliberate mix of all three compute models matched to each workload's actual traffic shape, self-host databases specifically where scale economics favor it, and treat VPC network rules as a rigorously maintained, audited security boundary (§68).
>
> **What would a two-person startup do?** Default to managed databases and either simple container hosting or serverless compute for nearly everything, and use default, provider-recommended VPC configurations rather than customizing network topology extensively.
>
> **What changes with scale?** At small scale, fully-managed options are close to always correct across every primitive in this chapter. At large, sustained scale, the specific tradeoffs in §43.2-43.4 (cold starts, storage-engine control, managed-service premiums) become large enough in absolute terms to justify more customized, self-managed alternatives for specific, carefully-chosen workloads (§68).

### 43.8 Exercises

1. A team runs a rarely-used internal admin tool on always-on virtual machines, paying for 24/7 uptime despite near-zero traffic outside business hours. Using §43.2, propose a better-matched compute model and explain the tradeoff it accepts in exchange.
2. Explain, using §43.5, why a VPC's default-deny network posture (nothing crosses the boundary unless a rule explicitly permits it) is a direct implementation of the trust-boundary principle from §17.3, and what risk a default-allow configuration would reintroduce.

### 43.9 Further Reading

- AWS, Azure, and GCP's respective "Well-Architected Framework" / architecture guidance documentation — practitioner-level, vendor-specific treatment of the tradeoffs summarized generically in this chapter.
- Werner Vogels, "A Decade of Dynamo" and related AWS re:Invent talks — real-world grounding for the managed-database tradeoffs discussed in §43.4.

---
