## 5. EBS

> **Decision Snapshot** — Tier 1 · Storage · Verdict: the default block storage for a single EC2 instance needing a real, mountable filesystem — your instance's "hard drive." Primary alternative: EFS if more than one instance needs to share the same filesystem; S3 if you don't actually need filesystem semantics at all.

### One-Line Summary
Network-attached block storage for EC2 — a virtual hard drive that persists independently of the instance's own lifecycle.

### Category
Storage

### Tier
Tier 1

### What It Does
EBS (Elastic Block Store) provides a block-level volume that attaches to a single EC2 instance at a time, formatted and mounted like any regular disk. Unlike an instance's local/instance-store disk (if it has one), an EBS volume's data survives stopping and starting the instance, and can be detached and reattached to a different instance entirely — this is what makes it the default for anything that needs to persist reliably across an instance's lifecycle (a database's data directory, an application's working files).

### When Should I Use It?
- Any EC2 instance needing persistent, mountable storage — the boot volume itself is almost always EBS.
- Self-managed database data directories where you're not using RDS.
- Workloads needing high, consistent IOPS a network filesystem (EFS) or object storage (S3) can't provide.

### When Should I NOT Use It?
- Multiple instances need to read/write the same filesystem concurrently — EBS is single-instance-attached (with a narrow multi-attach exception for specific clustered filesystems); use EFS instead.
- You don't actually need filesystem semantics — a file that's written once and read many times, without in-place modification, is usually better and cheaper in S3.

### Common Real-World Use Cases
- EC2 boot volumes.
- Self-hosted database data directories.
- Application working directories needing durable, low-latency local-feeling disk.

### Typical Architecture
```
EC2 Instance
    ↓ (attached)
EBS Volume (gp3 / io2, sized and provisioned for IOPS/throughput)
    ↓ (automated)
EBS Snapshot → S3 (backup, incremental)
```
Snapshots are the backup mechanism — incremental, stored in S3 under the hood, and the basis for both point-in-time recovery and creating new volumes from a known-good state (including across Availability Zones, since a snapshot, unlike the volume itself, isn't AZ-locked).

### Important Concepts
- **Volume types** — `gp3` (general purpose, the modern default, with independently configurable IOPS/throughput) versus `io2`/`io2 Block Express` (provisioned IOPS, for the highest and most consistent performance needs) versus `st1`/`sc1` (throughput-optimized HDD, for large sequential workloads like log processing).
- **AZ-locked** — a volume only attaches to instances in the same Availability Zone it was created in; moving across AZs requires a snapshot-and-restore.
- **IOPS vs. throughput** — two distinct performance dimensions; a workload doing many small random reads needs IOPS, one doing large sequential reads needs throughput, and provisioning for the wrong one is a common source of "why is this slow despite the volume being 'fast'."
- **Snapshots** — incremental (only changed blocks after the first), stored in S3, region-wide (not AZ-locked), and the mechanism for both backup and cross-AZ/region volume creation.

### Security Considerations
Enable encryption at rest by default (EBS encryption can be set as an account-wide default) — an unencrypted volume containing a database's data directory is a real, common audit finding. Snapshots inherit the encryption state of their source volume; sharing an unencrypted snapshot across accounts is a real data-exposure risk worth explicitly guarding against.

### Monitoring
Watch `VolumeQueueLength` (requests waiting, a direct signal of the volume being a bottleneck) alongside the obvious IOPS/throughput consumed-versus-provisioned metrics. A consistently high queue length with low IOPS utilization usually means the volume type or provisioned IOPS is mismatched to the actual access pattern, not that "the disk is failing."

### Scaling
Volumes can be resized (grown, and IOPS/throughput reconfigured) live without downtime on modern volume types, though the filesystem itself may need a separate resize step. Vertical scaling (a bigger/faster volume) is straightforward; horizontal scaling (many instances needing the same data) is exactly the case EBS doesn't solve — that's EFS's or a database's job.

### Cost Model
Billed per GB provisioned per month (not per GB actually used — an empty 500GB volume costs the same as a full one), plus provisioned IOPS/throughput if using `io2` or provisioned `gp3` tiers above the included baseline, plus snapshot storage (incremental, in S3). An oversized, mostly-empty volume attached "just in case" is a quiet, easy-to-miss recurring cost.

### Common Mistakes
- Provisioning for throughput when the workload actually needs IOPS, or vice versa.
- Leaving old, unattached volumes around after an instance is terminated (EBS volumes don't automatically delete with the instance unless `DeleteOnTermination` is explicitly set).
- Not encrypting volumes by default, then discovering it during a security audit.
- Assuming a snapshot restore is instant — the new volume can have a brief period of higher latency while blocks are lazily loaded from S3 in the background.

### Migration Path
**Outgrowing it**: the moment more than one instance genuinely needs to read/write the same data concurrently, migrate to EFS. **Downgrading**: if you find you never actually need in-place modification, moving that data to S3 is usually both cheaper and simpler.

### Interview Questions
1. What's the practical difference between EBS and instance store (ephemeral) storage?
2. Why is an EBS volume tied to a specific Availability Zone, and how do you move data across AZs?
3. What's the difference between IOPS and throughput, and how do you know which one a workload needs?
4. Why might a volume with plenty of unused IOPS still show high latency?
5. How do EBS snapshots work, and why are they described as incremental?
6. When would you choose `io2` over `gp3`, given the cost difference?
7. What happens to an EBS volume when its attached EC2 instance is terminated?
8. Why is EBS not a solution for a workload needing shared access from many instances?

### Python Example
```python
import boto3

ec2 = boto3.client("ec2", region_name="us-east-1")

# Provision a gp3 volume with explicit IOPS/throughput rather than accepting the
# baseline defaults -- matched to a workload doing moderate random I/O.
volume = ec2.create_volume(
    AvailabilityZone="us-east-1a",   # must match the instance's own AZ
    VolumeType="gp3",
    Size=100,
    Iops=4000,
    Throughput=250,
    Encrypted=True,                  # never leave this False by omission
    TagSpecifications=[{
        "ResourceType": "volume",
        "Tags": [{"Key": "Name", "Value": "app-data-volume"}],
    }],
)
print(volume["VolumeId"])
```
`Encrypted=True` is explicit here rather than relying on an account-wide default being correctly configured — for a volume you know will hold real data, stating the requirement directly in code is worth the one extra line.

### Best Practices
- Enable EBS encryption by default account-wide, and still set it explicitly for anything sensitive.
- Match volume type (and provisioned IOPS/throughput) to the actual measured access pattern, not a guess.
- Set `DeleteOnTermination` deliberately, per volume, rather than accepting whatever the default happens to be.
- Snapshot regularly and test restores — an untested backup is not a real backup.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Block Storage | EBS | Azure Managed Disks | Persistent Disk |

---
