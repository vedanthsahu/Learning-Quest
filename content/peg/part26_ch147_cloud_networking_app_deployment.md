## §147. Cloud Networking for Application Deployment

### 1. The Vocabulary

- **Public subnet vs private subnet** — a public subnet has a route to an Internet Gateway
  (reachable from the internet); a private subnet doesn't, and reaches the internet outbound only
  through a NAT Gateway if at all.
- **NAT Gateway** — lives in a public subnet and lets resources in a private subnet make outbound
  internet requests (e.g., calling an external API, downloading a package) without being
  reachable *from* the internet themselves.
- **Security group** — a stateful, instance/service-level virtual firewall; rules are typically
  written in terms of *source*, and a source can be another security group, not just an IP range.
- **The standard three-tier layout** — ALB (or bastion-like entry points) in public subnets; the
  application tier in private subnets; the database tier in private subnets, usually even more
  restricted than the app tier.

### 2. Where It Sits, and Why Teams Use It

This is the concrete network shape behind "the app and database aren't directly exposed to the
internet." Only the load balancer needs a public subnet and a route from the internet; everything
that actually runs your code or holds your data sits in private subnets, reachable only through the
load balancer (for the app) or only from the app tier (for the database) — each layer only trusts
the specific layer in front of it, not the whole internet.

### 3. What Actually Breaks

- **App servers with a security group allowing `0.0.0.0/0`** — the specific, common mistake this
  chapter exists to prevent: an app server's inbound rule should have the ALB's security group as
  its source, not "anywhere on the internet," even if the app is also behind a load balancer —
  defense in depth matters because misconfigurations elsewhere shouldn't mean total exposure.
- **Database directly reachable from the public internet** — a database security group that allows
  broad inbound access (sometimes done "temporarily" for debugging and never reverted) is one of
  the most common real-world breach vectors.
- **No NAT Gateway, so private-subnet resources can't reach external APIs or package registries**
  — a private-subnet app server needing to call a third-party API or download a dependency during
  deploy fails mysteriously without one.
- **Confusing "private subnet" with "no internet access at all"** — a private subnet with a NAT
  Gateway *can* reach outbound; "private" specifically means not reachable *from* the internet,
  which is a different property from "no internet access."

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Only the load balancer sits in a public subnet; the app and database tiers sit in private
  subnets, each only reachable from the specific layer in front of it."
- "I scope security group sources to other security groups, like the ALB's, rather than to broad
  IP ranges, even for services that are also behind a load balancer."
- "I know a NAT Gateway is what lets private-subnet resources make outbound calls without being
  reachable from the internet themselves."

### 5. Interview-Ready Answer

> "My default network shape is the app and database in private subnets, with only the load
> balancer in a public subnet. I scope security groups by source security group rather than by IP
> range — the app tier's inbound rule allows traffic from the ALB's security group specifically,
> not `0.0.0.0/0`, even though it's already behind a load balancer, since defense in depth matters
> if something else is misconfigured. And if the app tier needs outbound internet access — calling
> a third-party API, pulling dependencies — that goes through a NAT Gateway rather than putting the
> app tier in a public subnet directly."

### 6. Go Deeper

companion Cloud Engineering Playbook's §6 (VPC) chapter for the full subnet/routing-table
mechanics; this book's §65-66 (regions/AZs/VPC basics, subnets/security groups/NAT) for the
foundational vocabulary this chapter assumes.

---
