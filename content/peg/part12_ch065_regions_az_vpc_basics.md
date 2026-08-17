## §65. Regions, Availability Zones, and VPC Basics

### 1. The Vocabulary

- **Region** — a geographic area (e.g. `us-east-1`) containing multiple, physically separate
  data centers.
- **Availability Zone (AZ)** — one of those physically separate data centers within a region,
  isolated enough that one AZ's failure shouldn't affect another.
- **VPC (Virtual Private Cloud)** — your own logically isolated network within a cloud provider,
  where you control IP ranges, subnets, and routing.

### 2. Where It Sits, and Why Teams Use It

This is the top level of cloud infrastructure geography — every resource you create lives in a
specific region (and often a specific AZ), and understanding this hierarchy is the prerequisite
for reasoning about latency, redundancy, and data residency at all.

### 3. What Actually Breaks

- **Everything in one AZ "because it's simpler"** — reintroduces the single-point-of-failure
  problem §57 describes, at the infrastructure-provider level specifically.
- **Assuming resources in different regions can talk to each other with the same latency as
  within one region** — cross-region traffic has real, often significant added latency, and
  sometimes added cost, that same-region traffic doesn't.
- **Not understanding VPC boundaries** — resources in different VPCs can't reach each other by
  default; that requires explicit peering, a Transit Gateway, or another deliberate connection,
  not something that happens automatically just because both are "in AWS."
- **Data residency/compliance requirements not matching actual resource region** — some
  regulations require data to stay within a specific geographic jurisdiction; picking a region
  without checking this can be a real compliance problem, not just a technical one.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "A region contains multiple Availability Zones, and spreading redundant infrastructure across
  AZs (not just multiple instances in one AZ) is what actually protects against a data-center-
  level failure."
- "Resources in separate VPCs don't talk to each other by default — that needs explicit peering or
  a Transit Gateway."
- "I check data residency requirements against actual region choice, not just latency or cost."

### 5. Interview-Ready Answer

> "A region is a geographic area made up of multiple physically separate Availability Zones —
> real redundancy means spreading resources across AZs, not just running multiple instances in
> one. A VPC is my own isolated network within that region, and resources in separate VPCs can't
> reach each other without an explicit connection like peering — it's not automatic just because
> both are within the same cloud provider."

### 6. Go Deeper

companion Cloud Engineering Playbook's §6 (VPC) chapter (full depth: route tables, NAT gateway,
internet gateway).

---
