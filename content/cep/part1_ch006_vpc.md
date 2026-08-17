## 6. VPC

> **Decision Snapshot** — Tier 1 · Networking · Verdict: not optional — every AWS account's resources live inside a VPC, by default or by design. The real decision is how deliberately you design its subnet/routing structure, not whether to use one. Primary alternative: none — this is foundational networking, not a feature you choose to adopt.

### One-Line Summary
Your own private, logically isolated network within AWS — the subnets, route tables, and gateways that determine what can talk to what.

### Category
Networking

### Tier
Tier 1

### What It Does
A VPC (Virtual Private Cloud) is an isolated IP address space you control, divided into subnets (each pinned to one Availability Zone), connected by route tables that determine where traffic goes, and bordered by gateways (Internet Gateway for public access, NAT Gateway for private-subnet outbound access, VPN/Direct Connect/Transit Gateway for connecting to other networks). Nearly everything else in this book — EC2, RDS, Lambda-in-a-VPC, ECS/EKS — runs inside a VPC's subnets and inherits its routing and security group rules. Understanding VPC design well is what makes every other service's networking behavior predictable rather than mysterious.

### When Should I Use It?
Always — the question isn't whether to use a VPC, it's whether to accept the account's Default VPC (fine for quick experiments) or design a real one (required for anything production-facing, multi-tier, or security-sensitive).

### When Should I NOT Use the Default VPC
- Anything production — the Default VPC's flat, all-public-subnet design has no real network segmentation between tiers.
- Multi-account or multi-region architectures needing deliberate CIDR planning to avoid overlapping IP ranges that would block future peering/Transit Gateway connectivity.

### Common Real-World Use Cases
- Public subnets for internet-facing load balancers/NAT gateways; private subnets for application servers and databases with no direct internet route.
- Isolated subnets (no route to the internet at all, even via NAT) for the most sensitive tiers (a database with genuinely no need to initiate outbound internet traffic).
- VPC Peering or Transit Gateway for connecting multiple VPCs (different environments, different teams, different accounts).

### Typical Architecture
```
                    Internet Gateway
                          ↓
        Public Subnet (AZ-a)      Public Subnet (AZ-b)
        [ALB]  [NAT Gateway]      [ALB]  [NAT Gateway]
                          ↓ (routed via NAT)
        Private Subnet (AZ-a)     Private Subnet (AZ-b)
        [EC2/ECS tasks]           [EC2/ECS tasks]
                          ↓
        Isolated Subnet (AZ-a)    Isolated Subnet (AZ-b)
        [RDS]                     [RDS]
```
Three tiers, each in at least two Availability Zones for resilience — public (internet-facing), private (outbound-only via NAT), and isolated (no internet route at all) — is the standard, defensible default shape for a production VPC.

### Important Concepts
- **CIDR blocks** — the IP address range a VPC (and each subnet within it) owns; planning non-overlapping ranges across environments/accounts up front avoids painful re-addressing later when you need to connect them.
- **Route tables** — per-subnet rules determining where traffic destined for a given IP range goes; a subnet with a route to an Internet Gateway is "public," one without is "private," regardless of what you name it.
- **Security Groups vs. Network ACLs** — security groups are stateful (a response to an allowed request is automatically allowed back) and attached to resources (instances, ENIs); NACLs are stateless and attached to subnets — most designs lean almost entirely on security groups, with NACLs reserved for coarse subnet-level deny rules.
- **NAT Gateway** — lets private-subnet resources initiate outbound internet traffic (e.g., pulling a package update) without being directly reachable from the internet; billed per hour plus per GB processed, and a genuinely easy-to-miss cost line.
- **VPC Peering vs. Transit Gateway** — peering is a direct, one-to-one connection between two VPCs (doesn't scale well past a handful); Transit Gateway is a hub connecting many VPCs (and on-prem networks) through one place, the standard choice once you have more than a few VPCs to connect.
- **VPC Endpoints** — lets resources in private/isolated subnets reach AWS services (S3, DynamoDB, and many others) without routing through the internet at all, both more secure and often cheaper than routing that traffic through a NAT Gateway.

### Security Considerations
Default-deny security groups, opening only specific ports from specific sources (ideally referencing another security group, not a raw CIDR, so rules survive IP churn). Keep databases in isolated subnets with no route to the internet, even via NAT — there's rarely a legitimate reason for a database to initiate outbound internet traffic. VPC Flow Logs (to CloudWatch or S3) give you a record of actual traffic for both security investigation and simply debugging "why can't these two things talk to each other."

### Monitoring
VPC Flow Logs are the primary tool — they record accepted and rejected traffic at the ENI level, and are usually the fastest way to answer "is this a security group problem, a route table problem, or is the traffic not even leaving the source" during a connectivity incident (companion §56's failure-engineering chapter is built around exactly this triage).

### Scaling
A VPC's IP address space is the real, hard scaling constraint — running out of usable IPs in a subnet (common in a rapidly-scaling ECS/EKS cluster using one IP per task/pod under `awsvpc` networking) is a real, recurring production issue; planning subnet sizes generously up front is far cheaper than re-addressing later.

### Cost Model
The VPC itself is free; NAT Gateways bill per-hour plus per-GB processed (often a surprisingly large line item at scale); VPC Peering and Transit Gateway attachments bill per connection/hour plus data processed; VPC Endpoints for AWS services (Gateway type, e.g., S3/DynamoDB) are free, while Interface-type endpoints bill per-hour plus per-GB.

### Common Mistakes
- Using the Default VPC's flat structure for production, with no real public/private/isolated segmentation.
- Under-sizing subnet CIDR ranges, then running out of IPs as an ECS/EKS cluster or Lambda-in-VPC usage grows.
- Routing all AWS-service traffic (S3, DynamoDB) through a NAT Gateway instead of using free Gateway VPC Endpoints.
- Overlapping CIDR ranges across VPCs that later need to be peered or connected via Transit Gateway.
- Forgetting that a database in a "private" subnet with a NAT Gateway route can still technically reach the internet — "isolated" (no NAT route at all) is a stronger, deliberate guarantee.

### Migration Path
There's no "outgrowing" a VPC in the way you outgrow a compute service — the migration path here is almost always about topology: moving from a single flat VPC to a multi-account, Transit-Gateway-connected structure as an organization grows (companion §48's Account & Organization Design Guide covers this directly).

### Interview Questions
1. What's the actual difference between a public and a private subnet, mechanically?
2. Why are security groups described as stateful and NACLs as stateless, and what does that mean practically?
3. When would you use VPC Peering versus Transit Gateway?
4. What problem do VPC Endpoints solve, and why might they be both more secure and cheaper than a NAT Gateway?
5. How would you debug two resources in the same VPC that can't reach each other?
6. Why does CIDR planning matter before you ever need to connect two VPCs?
7. What's the practical difference between a "private" subnet and an "isolated" subnet?
8. How do you run out of IP addresses in a subnet, and what does that actually break?
9. What does a VPC Flow Log actually record, and how would you use it during an incident?
10. Why might placing a Lambda function inside a VPC affect its networking behavior differently than an EC2 instance?

### Python Example
```python
import boto3

ec2 = boto3.client("ec2", region_name="us-east-1")

vpc = ec2.create_vpc(CidrBlock="10.0.0.0/16")["Vpc"]
vpc_id = vpc["VpcId"]

# A generously-sized private subnet -- /20 gives ~4000 usable IPs, avoiding the
# common mistake of under-sizing and later running out under ECS/EKS task growth.
private_subnet = ec2.create_subnet(
    VpcId=vpc_id, CidrBlock="10.0.16.0/20", AvailabilityZone="us-east-1a"
)["Subnet"]

# Gateway VPC Endpoint for S3 -- routes S3 traffic without a NAT Gateway or the
# internet at all, both cheaper and more secure than the alternative.
ec2.create_vpc_endpoint(
    VpcId=vpc_id,
    ServiceName="com.amazonaws.us-east-1.s3",
    RouteTableIds=[],  # attach to the private subnet's route table in practice
    VpcEndpointType="Gateway",
)
```
The `/20` subnet size is a deliberate choice, not an accident — sized to comfortably absorb an `awsvpc`-networked ECS/EKS cluster's one-IP-per-task consumption well past initial launch scale, directly avoiding the IP-exhaustion mistake named above.

### Best Practices
- Design a real public/private/isolated three-tier subnet structure for anything production, even at small scale.
- Size subnets generously — running out of IPs later is far more disruptive than using a slightly larger CIDR up front.
- Use Gateway VPC Endpoints for S3/DynamoDB traffic instead of routing it through a NAT Gateway.
- Reference security groups by ID in other security group rules, not raw CIDR ranges, where the source is another AWS resource.
- Enable VPC Flow Logs before you need them, not after an incident.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Virtual Network | VPC | Virtual Network (VNet) | VPC |

---
