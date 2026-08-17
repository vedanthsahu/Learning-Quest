## §66. Subnets, Security Groups, and NAT Gateways

### 1. The Vocabulary

- **Public subnet** — has a route to an internet gateway, so resources in it can be directly
  reachable from (and reach out to) the internet.
- **Private subnet** — no direct route to the internet; resources here can't be reached directly
  from outside.
- **Security group** — a stateful, resource-level virtual firewall (if you allow inbound traffic
  on a connection, the response is automatically allowed back out).
- **NAT Gateway** — lets private-subnet resources initiate *outbound* internet connections (e.g.
  to download an update) without being directly reachable from the internet themselves.

### 2. Where It Sits, and Why Teams Use It

This is the standard shape of a secure cloud network: public-facing components (a load balancer)
in a public subnet, everything else (application servers, databases) in private subnets, with a
NAT Gateway as the one-way door for private resources that still need outbound internet access.

### 3. What Actually Breaks

- **A database directly in a public subnet** — even with security group rules restricting access,
  putting a database where it *could* be reachable from the internet at all is an unnecessary
  risk; it should simply not have a route to the internet in the first place, via a private
  subnet.
- **No NAT Gateway, so a private-subnet resource can't reach anything external** — a private
  application server that needs to call a third-party API or download a package update will
  simply fail to connect, with a confusing timeout, unless a NAT Gateway (or equivalent) is in
  place for outbound traffic.
- **Security group rules too broad** — allowing inbound traffic from `0.0.0.0/0` (anywhere) on a
  port that should only be reachable from a specific load balancer or internal service is a
  common, avoidable overexposure.
- **Confusing security groups with network ACLs** — security groups are stateful and attached to
  resources; network ACLs are stateless and attached to subnets — using only one when a specific
  scenario actually needs both layers is a common gap.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Databases and internal services go in private subnets — no route to the internet at all, not
  just restricted by security group rules."
- "A NAT Gateway is what lets private-subnet resources make outbound calls without being directly
  reachable themselves — I check for one whenever a private resource needs to call something
  external."
- "I scope security group rules to the specific source (another security group, a specific IP
  range) rather than defaulting to allow-from-anywhere."

### 5. Interview-Ready Answer

> "My default shape is public subnets for anything that genuinely needs to be internet-facing —
> usually just a load balancer — and private subnets for everything else, including databases and
> internal application servers. Private subnets have no direct route to the internet at all, which
> is a stronger guarantee than just restricting access via security group rules. If something in a
> private subnet needs outbound internet access — calling a third-party API, for instance — that
> goes through a NAT Gateway, which allows outbound without making the resource directly
> reachable from outside."

### 6. Go Deeper

companion Cloud Engineering Playbook's §6 (VPC) chapter (route tables, NAT gateway, internet
gateway in full depth).

---
