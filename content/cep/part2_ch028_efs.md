## 28. EFS

> **Decision Snapshot** — Tier 2 · Storage · Verdict: the choice specifically when multiple instances/containers need to read and write the same POSIX filesystem concurrently. Primary alternative: S3 (companion §4) if you don't actually need real filesystem semantics; EBS (companion §5) if only a single instance needs the data.

### One-Line Summary
A managed, shared, POSIX-compliant filesystem mountable by many EC2 instances or containers at once, growing and shrinking automatically with no capacity to provision.

### Category
Storage

### Tier
Tier 2

### What It Does
EFS (Elastic File System) provides a network filesystem mountable via NFS from many EC2 instances or ECS/EKS tasks simultaneously, with storage capacity scaling automatically (no provisioning a size up front the way EBS requires) and lifecycle management moving infrequently-accessed files to cheaper storage classes automatically. This is the direct answer to the specific gap EBS (single-instance-attached) and S3 (not a real filesystem) both leave open: genuine, shared, concurrent, POSIX-semantic file access.

### When Should I Use It?
- Multiple EC2 instances or containers genuinely need to read/write the same files concurrently with real filesystem semantics (locking, directory operations, in-place modification).
- Content management systems, shared configuration/code directories across a fleet, or legacy applications expecting a shared network filesystem.
- Lift-and-shift migrations of on-prem workloads already built around shared NFS storage.

### When Should I NOT Use It?
- A single instance's own data — EBS is simpler and typically cheaper for that case.
- Data that doesn't need in-place filesystem semantics at all — S3 is both cheaper and better suited to write-once, read-many object access patterns.
- Extremely high, sustained IOPS requirements that a purpose-built block storage volume handles more predictably.

### Common Real-World Use Cases
- Shared upload/media directories across a horizontally-scaled web application fleet.
- Shared configuration or plugin directories for a CMS running across multiple containers.
- Home directories or shared workspaces in an HPC/research computing context.

### Typical Architecture
```
[EC2] [EC2] [EC2] ...  (or ECS/EKS tasks, across multiple AZs)
    ↓        ↓        ↓
        EFS (mounted by all, same shared filesystem)
```
Every instance/task sees the exact same filesystem state simultaneously — a file written by one is immediately visible to all others, the specific concurrent-shared-access property neither EBS nor S3 provides.

### Important Concepts
- **Performance modes** — General Purpose (lower latency, the default for most workloads) versus Max I/O (higher aggregate throughput/IOPS at slightly higher per-operation latency, for highly parallel workloads).
- **Throughput modes** — Bursting (scales with storage size, with a burst credit model) versus Provisioned (a fixed throughput independent of storage size, for workloads needing high throughput on a small amount of data) versus Elastic (automatically scales throughput up/down with actual demand, removing the need to choose).
- **Lifecycle management** — automatically moves files untouched for a configured period to Infrequent Access storage (cheaper per-GB, small per-access retrieval cost), directly analogous to S3's storage classes (companion §4).
- **Mount targets** — one per Availability Zone, which is why an EFS file system used across multiple AZs needs a mount target provisioned in each.

### Security Considerations
Use EFS access points to enforce a specific POSIX user/group and root directory per application, rather than every mounting client having unrestricted access to the entire filesystem — a meaningful, easy-to-apply isolation boundary between different applications sharing one file system. Encrypt at rest via KMS and enforce encryption in transit for the NFS mount itself.

### Monitoring
`PercentIOLimit` (Bursting mode's burst-credit consumption), `ClientConnections`, and per-mount-target throughput are the key signals; a workload consistently running near its burst credit limit under Bursting throughput mode is a direct signal to move to Provisioned or Elastic throughput mode.

### Scaling
Storage capacity scales automatically with no provisioning needed at all — a genuine, meaningful difference from EBS. Throughput scaling depends entirely on the chosen throughput mode (see Important Concepts); Elastic mode removes the need to reason about this tradeoff manually.

### Cost Model
Billed per GB stored per month (Standard storage class), with Infrequent Access priced lower per-GB but with a small per-GB retrieval fee, plus throughput charges under Provisioned mode. A file system with lifecycle management disabled, holding a large volume of genuinely cold data in Standard storage indefinitely, is a real, common source of avoidable cost.

### Common Mistakes
- Using EFS for a single instance's data where EBS would be simpler and cheaper.
- Not enabling lifecycle management, leaving cold data in the more expensive storage class indefinitely.
- Every application sharing a file system with unrestricted access to the whole tree, instead of using access points to scope each application to its own directory.
- Choosing Bursting throughput mode for a consistently high-throughput workload and hitting burst-credit exhaustion repeatedly, rather than moving to Provisioned or Elastic mode.

### Migration Path
**From EBS**: the direct migration path once a single-instance need becomes a genuinely multi-instance, concurrent-shared-access need. **To S3**: if it turns out real filesystem semantics were never actually required, moving the data to S3 is usually both cheaper and simpler.

### Interview Questions
1. What specific gap does EFS fill that neither EBS nor S3 covers?
2. What's the difference between General Purpose and Max I/O performance modes?
3. How does Elastic throughput mode remove a manual scaling decision Bursting/Provisioned modes require?
4. What's an EFS access point, and what security problem does it solve?
5. Why does a multi-AZ EFS deployment need a mount target per Availability Zone?

### Python Example
```python
import boto3

efs = boto3.client("efs", region_name="us-east-1")

fs = efs.create_file_system(
    PerformanceMode="generalPurpose",
    ThroughputMode="elastic",     # removes the need to manually choose burst vs. provisioned
    Encrypted=True,
    Tags=[{"Key": "Name", "Value": "shared-app-storage"}],
)

# An access point scoping this specific application to its own directory and POSIX
# identity, rather than unrestricted access to the entire shared file system.
efs.create_access_point(
    FileSystemId=fs["FileSystemId"],
    PosixUser={"Uid": 1000, "Gid": 1000},
    RootDirectory={"Path": "/app-data", "CreationInfo": {"OwnerUid": 1000, "OwnerGid": 1000, "Permissions": "0755"}},
)
```
The access point restricts this specific mounting application to `/app-data` under a fixed POSIX identity — a different application sharing the same underlying file system, mounted via its own separate access point, would have no visibility into this directory at all, directly implementing the isolation this chapter recommends over unrestricted shared access.

### Best Practices
- Use access points to scope each application to its own directory and identity.
- Enable lifecycle management to move cold data to Infrequent Access automatically.
- Choose Elastic throughput mode unless you have a specific, well-understood reason to manually manage Bursting or Provisioned.
- Reserve EFS specifically for genuine multi-instance, concurrent, POSIX-semantic access needs.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Managed Shared File Storage | EFS | Azure Files | Filestore |

---
