## 1. EC2

> **Decision Snapshot** — Tier 1 · Compute · Verdict: the default choice for workloads that need full control over the OS, long-running processes, or specific hardware (GPU, high memory, custom AMIs) that a managed compute service can't give you. Primary alternative: ECS/EKS if you're already containerizing, Lambda if the workload is short and event-driven.

### One-Line Summary
A resizable virtual machine you rent by the second (or lock in with a longer commitment for a discount), giving you root access to a full Linux/Windows instance.

### Category
Compute

### Tier
Tier 1

### What It Does
EC2 (Elastic Compute Cloud) provisions a virtual machine from a chosen instance type (a fixed CPU/memory/network ratio) and AMI (a disk image — your OS plus anything baked in). You get root/administrator access, a persistent (or ephemeral, depending on storage choice) disk, and full control over what runs on it. Everything else in AWS compute — ECS, EKS, Lambda, Fargate — is either "EC2 with a scheduler and orchestration layer on top" or "EC2 abstracted away entirely." Understanding EC2 first is what makes those other services make sense.

### When Should I Use It?
- You need full OS-level control: custom kernels, specific system libraries, licensing-locked software, GPU drivers.
- Long-running, stateful, or non-containerized workloads where the operational cost of containerizing isn't worth it yet.
- Predictable, steady-state load where a Reserved Instance or Savings Plan meaningfully beats on-demand container/serverless pricing.
- You're running something that needs to bind to specific network interfaces, kernel-level tuning, or specialized hardware (GPU/FPGA instance families).

### When Should I NOT Use It?
- Short-lived, bursty, event-driven work — Lambda avoids you paying for idle capacity entirely.
- You're already containerizing your application — ECS/EKS (optionally on Fargate) give you the same EC2 underneath with orchestration, health checks, and rolling deploys you'd otherwise build yourself.
- You want to avoid patching, AMI hygiene, and instance lifecycle management as an ongoing operational cost — that cost is real and compounds over years of a fleet's life.

### Common Real-World Use Cases
- Self-managed application servers behind a load balancer, before or instead of containerizing.
- Bastion/jump hosts for VPC access.
- Self-hosted databases or caches when a managed equivalent (RDS/ElastiCache) doesn't fit a specific requirement.
- Batch/ML training jobs needing GPU instance families (`p`, `g` series).
- Windows-licensed workloads that can't run in Lambda/containers.

### Typical Architecture
```
Route 53 → CloudFront (optional) → Application Load Balancer
                                          ↓
                                   Auto Scaling Group
                                          ↓
                              [EC2] [EC2] [EC2] ...  (across AZs)
                                          ↓
                                    RDS / ElastiCache
```
EC2 instances almost never sit directly behind a public endpoint in a real architecture — an ALB in front, an Auto Scaling Group wrapping the fleet, and IAM instance roles (never embedded credentials) for talking to other AWS services are the default, not the exception.

### Important Concepts
- **Instance families and sizing** — general purpose (`m`), compute-optimized (`c`), memory-optimized (`r`), storage-optimized (`i`/`d`), GPU (`p`/`g`) — picking the wrong family is the single most common source of "why is this slow/expensive."
- **On-Demand vs. Reserved Instances/Savings Plans vs. Spot** — on-demand is the ceiling price; Spot is up to ~90% cheaper but can be reclaimed with a 2-minute warning; Reserved/Savings Plans trade a 1-3 year commitment for a discount on steady-state load.
- **AMIs** — the disk image an instance boots from; a golden-AMI pipeline (bake dependencies in at build time, not boot time) meaningfully speeds up scaling and reduces boot-time failure surface.
- **Instance metadata service (IMDS)** and IMDSv2 — how an instance discovers its own role credentials; IMDSv2's session-token requirement closes a real SSRF-to-credential-theft path IMDSv1 left open.
- **Placement groups, ENIs, EBS-optimized instances** — networking and storage throughput characteristics that vary meaningfully by instance type.
- **User data** — a boot-time script; useful for last-mile configuration, but a golden AMI should carry most of the weight, not user data, for fast, reliable scaling.

### Security Considerations
Always attach an IAM instance role rather than embedding access keys on the box — a compromised instance with an over-permissioned role is a much smaller blast radius than one with static credentials that outlive the instance. Use IMDSv2 exclusively (enforce it at launch template level). Security groups are stateful firewalls scoped per-instance/ENI — default-deny, open only what's needed, and prefer referencing other security groups over hardcoded IP ranges so rules survive IP churn. Patch cadence is your responsibility here in a way it isn't with a managed service — this is a genuine, recurring operational cost to budget for.

### Monitoring
CloudWatch's default EC2 metrics (CPUUtilization, NetworkIn/Out, disk I/O) do **not** include memory or disk-space-used by default — this surprises almost everyone once, usually during an incident. The CloudWatch Agent must be installed and configured explicitly for memory/disk metrics, and this should be baked into your golden AMI, not treated as optional. Status checks (system vs. instance) distinguish "AWS's hardware failed" from "your OS/application is unhealthy" — alarm on both, differently.

### Scaling
Vertical: resize the instance type (requires a stop/start, brief downtime unless designed around). Horizontal: an Auto Scaling Group adds/removes instances based on a scaling policy (target tracking on CPU/custom metric is the common default). The real bottleneck as a fleet grows is rarely EC2 itself — it's almost always the shared downstream (a database connection pool, companion Software Systems Handbook §31/§39) that doesn't scale as elastically as the compute layer sitting in front of it.

### Cost Model
You pay per-second (Linux) for the instance type you chose, regardless of actual CPU utilization — an idle m5.xlarge costs the same as a busy one. EBS volumes, data transfer out to the internet, and any attached Elastic IPs left unassociated all bill separately and are common sources of surprise cost. Spot pricing fluctuates with supply/demand per instance type per AZ; Savings Plans commit to a dollar-per-hour compute spend (more flexible than Reserved Instances, which commit to a specific instance family).

### Common Mistakes
- Forgetting the CloudWatch Agent, then having no memory/disk visibility during an incident.
- Leaving an unattached Elastic IP running (billed hourly, easy to lose track of).
- Using IMDSv1, leaving an SSRF vulnerability in the application a path to instance-role credentials.
- Baking secrets into a public AMI (a genuinely common, genuinely severe real incident pattern).
- Sizing an instance family for peak load and running it at that size permanently, instead of using an Auto Scaling Group to only pay for peak during peak.

### Migration Path
**Outgrowing it**: if you're managing a fleet's patching/scaling/health-checking by hand, migrate to ECS or EKS (optionally on Fargate to remove even the underlying-instance management) — you get the same compute with orchestration. **Downgrading from it**: if a workload turns out to be short-lived and event-driven rather than long-running, Lambda removes the idle-capacity cost entirely.

### Interview Questions
1. What's the difference between a Reserved Instance, a Savings Plan, and Spot pricing?
2. Why might an application be slow on an EC2 instance with low CPU utilization?
3. What does IMDSv2 protect against that IMDSv1 doesn't?
4. How would you design a fleet to gracefully handle Spot instance reclamation?
5. What's the difference between an instance status check failure and a system status check failure?
6. Why don't EC2's default CloudWatch metrics include memory usage?
7. How do you choose between a compute-optimized and memory-optimized instance family for a given workload?
8. What's the operational difference between baking configuration into an AMI versus applying it via user data at boot?
9. How would you rotate credentials for an application running on EC2 without ever storing a static access key?
10. What happens to ephemeral (instance store) data when you stop an instance, versus when you terminate it?

### Python Example
```python
import boto3

ec2 = boto3.client("ec2", region_name="us-east-1")

# Launch from a pre-built (golden) AMI, with an instance profile role attached --
# no embedded credentials, IMDSv2 enforced, tagged for cost allocation.
response = ec2.run_instances(
    ImageId="ami-0123456789abcdef0",       # your golden AMI, not a bare public one
    InstanceType="m5.large",
    MinCount=1,
    MaxCount=1,
    IamInstanceProfile={"Name": "app-server-role"},
    MetadataOptions={"HttpTokens": "required"},  # enforces IMDSv2
    TagSpecifications=[{
        "ResourceType": "instance",
        "Tags": [{"Key": "Environment", "Value": "production"}, {"Key": "Team", "Value": "backend"}],
    }],
    SecurityGroupIds=["sg-0123456789abcdef0"],
    SubnetId="subnet-0123456789abcdef0",
)
instance_id = response["Instances"][0]["InstanceId"]
print(f"Launched {instance_id}")
```
`MetadataOptions={"HttpTokens": "required"}` is the single line that closes off the IMDSv1 SSRF-to-credential path discussed above — it should be non-negotiable in any launch template. Tags aren't cosmetic here: they're what makes Cost Explorer (companion §29) able to attribute spend back to a team or environment at all.

### Best Practices
- Bake configuration into a golden AMI; keep user data minimal.
- Enforce IMDSv2 at the launch template level, fleet-wide.
- Install and configure the CloudWatch Agent in the AMI itself, not as an afterthought.
- Tag everything at launch — cost attribution and incident triage both depend on it.
- Use an Auto Scaling Group (companion §23) even for a "fixed size" fleet, so unhealthy-instance replacement is automatic.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Virtual Machine | EC2 | Azure Virtual Machines | Compute Engine |

---
