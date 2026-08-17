## 56. Why Did My VPC Networking Break?

*(Prerequisite: companion §6 VPC)*

### 56.1 Symptoms
Two resources that should be able to communicate can't — a timeout or connection-refused error, with no obvious application-level cause, often appearing suddenly after an infrastructure change (a security group edit, a route table change, a new subnet).

### 56.2 Possible Causes
A security group rule missing or too restrictive on either the source or destination resource; a route table missing a route to the destination (or, for internet-bound traffic from a private subnet, no NAT Gateway route); a Network ACL rule blocking traffic a security group would otherwise allow (NACLs and security groups are evaluated independently — both must permit traffic); DNS resolution failing within the VPC (missing a VPC Endpoint for an AWS service, or a private hosted zone misconfiguration, companion §7); the resources are simply in different, unpeered/unconnected VPCs.

### 56.3 Metrics
There typically aren't rich native CloudWatch metrics for "connectivity" itself — VPC Flow Logs are the primary diagnostic tool here, not a metric dashboard.

### 56.4 Logs
VPC Flow Logs record accepted and rejected traffic at the ENI level, including which rule caused a rejection — this is, in practice, the single fastest way to answer "is this a security group problem, a NACL problem, or is the traffic not even leaving the source in the first place," and should be the first thing checked, before manually re-reading every security group rule by eye.

### 56.5 Investigation
Enable (or check existing) VPC Flow Logs for the source and destination ENIs, filtering for the specific traffic in question — a `REJECT` entry immediately tells you traffic reached the network layer and was blocked (check security groups and NACLs); no entry at all suggests the traffic isn't even leaving the source (check the route table, or whether the destination address/DNS resolution is even correct). Confirm both resources are actually in the same VPC (or a properly peered/Transit-Gateway-connected one) before investigating rules at all.

### 56.6 Root Cause
In practice, the most common causes are: a security group change (often as part of an unrelated infrastructure update) inadvertently removing or narrowing a rule that was actually load-bearing, and a private subnet resource attempting to reach the internet with no NAT Gateway route configured, mistaken for an application-level failure rather than a networking one.

### 56.7 Fix
For a security-group/NACL block, add the specific missing rule — sourced from the actual VPC Flow Log `REJECT` entry, not a guess. For a missing route, add the appropriate route table entry (a NAT Gateway route for private-subnet internet access, a VPC Endpoint route for AWS-service access without the internet at all, companion §6). For DNS issues, verify the private hosted zone association or VPC Endpoint configuration.

### 56.8 Tradeoffs
Broadening a security group rule to "just make it work" is a common but genuinely risky shortcut — the correct fix is the specific, narrow rule the Flow Log evidence actually points to, not the broadest rule that would also happen to fix it. Adding a NAT Gateway for internet access has a real, ongoing cost (companion §6) — for AWS-service-only traffic, a VPC Endpoint is usually the more targeted, often cheaper fix.

### 56.9 Prevention
Enable VPC Flow Logs proactively, before they're needed for an investigation, not reactively during an incident. Treat security group and route table changes with the same change-review discipline as application code changes — an infrastructure change breaking connectivity is exactly the kind of regression a review process is meant to catch before it reaches production. Document which security group rules are load-bearing and why, so a future change doesn't remove one without understanding its purpose.

### 56.10 Decision Tree
```
Check VPC Flow Logs for the specific source/destination traffic:
  Shows a REJECT entry -> Identify which rule (security group or NACL) rejected it,
     from the log entry itself, and add the specific missing allow rule.
  No entry at all -> Traffic isn't reaching the network layer as expected; check
     the route table (missing route, missing NAT Gateway) and DNS resolution.
  Traffic appears ACCEPTED in Flow Logs but the application still fails -> The
     problem is likely above the network layer (application-level, not VPC networking).
```

---
