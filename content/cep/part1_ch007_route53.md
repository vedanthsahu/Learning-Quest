## 7. Route 53

> **Decision Snapshot** — Tier 1 · Networking · Verdict: the default choice for DNS on AWS, and often the right choice even for infrastructure that isn't otherwise AWS-hosted, specifically for its health-check-driven routing policies. Primary alternative: a third-party DNS provider if you have a specific existing relationship or multi-cloud DNS-management preference — the core DNS function is otherwise a commodity.

### One-Line Summary
Managed DNS, plus health-check-aware routing policies (failover, latency-based, weighted, geolocation) that go beyond what plain DNS hosting normally offers.

### Category
Networking

### Tier
Tier 1

### What It Does
Route 53 resolves domain names to IP addresses (or other records) like any DNS service, but its differentiator is routing policies that react to health checks and traffic-shaping needs: routing users to the nearest healthy region, splitting traffic by weighted percentage for a canary rollout, or failing over to a backup endpoint automatically when the primary's health check fails. It also handles domain registration and, via Route 53 Resolver, DNS resolution within a VPC and between VPCs/on-prem networks.

### When Should I Use It?
- Any AWS-hosted application needing DNS — the tight integration with health checks and AWS resource aliasing (pointing directly at an ALB/CloudFront/S3 endpoint without a separate IP lookup) is a real, practical advantage.
- Multi-region failover or latency-based routing across regions.
- Weighted routing for canary/blue-green traffic splitting at the DNS level.

### When Should I NOT Use It?
- You have an existing, working DNS setup elsewhere with no specific need for AWS-aware routing policies — migrating DNS has real cutover risk and should be justified by an actual need, not done reflexively.

### Common Real-World Use Cases
- Alias records pointing a domain directly at an ALB, CloudFront distribution, or S3 static website endpoint.
- Health-check-driven failover between a primary and standby region.
- Private hosted zones for internal service discovery within a VPC.

### Typical Architecture
```
User → Route 53 (DNS query)
           ↓ (routing policy: latency-based / failover / weighted)
   [ALB in us-east-1]   [ALB in eu-west-1]
           ↓                    ↓
      Application          Application
```
An **Alias record** pointing at an ALB/CloudFront/S3 endpoint is preferred over a plain CNAME wherever AWS resources are involved — it resolves to the target's current IP at query time (handling IP changes transparently) and, unlike a CNAME, can be used at a zone apex (the bare domain, not just a subdomain).

### Important Concepts
- **Hosted zones** — public (resolvable from the internet) or private (resolvable only within specified VPCs).
- **Routing policies** — Simple, Weighted, Latency-based, Failover, Geolocation, Geoproximity, Multivalue Answer — each solving a different traffic-shaping need; picking the wrong one is a common source of "why isn't traffic going where I expect."
- **Health checks** — the mechanism failover and geoproximity routing depend on; a health check pointed at the wrong endpoint or with too-loose a failure threshold silently defeats the whole point of a failover setup.
- **TTL (Time To Live)** — how long resolvers cache a record; a low TTL enables fast failover/cutover but increases query volume (and cost) since resolvers re-query more often.

### Security Considerations
DNSSEC is available and worth enabling for domains where DNS-spoofing/cache-poisoning is a genuine concern. Private hosted zones should be scoped to only the VPCs that genuinely need them — an overly-broad private zone association is a minor but real information-disclosure surface.

### Monitoring
CloudWatch metrics on health checks (status, latency) are the direct signal for whether failover routing is working as designed — a health check silently failing (misconfigured endpoint, wrong port) can leave failover routing inert exactly when you need it, discovered only during a real outage if not tested proactively.

### Scaling
Route 53 itself scales transparently — there's no capacity to plan for. The practical scaling consideration is TTL tuning: a very low TTL for fast-changing infrastructure trades higher query volume/cost for faster propagation of changes.

### Cost Model
Billed per hosted zone per month, per million queries (tiered, cheaper at volume), and per health check. Domain registration is a separate annual cost. None of this is typically a large line item relative to compute/storage, but very low TTLs on high-traffic domains can meaningfully increase query-based cost.

### Common Mistakes
- Setting a health check against the wrong endpoint or port, silently defeating failover routing.
- Using a CNAME instead of an Alias record for AWS resources, missing the zone-apex support and losing the automatic-IP-update benefit.
- Leaving a high TTL on a record you'll need to change quickly during an incident (e.g., a manual failover), delaying propagation exactly when speed matters.
- Not testing failover routing proactively, discovering a misconfiguration only during a genuine primary-region outage.

### Migration Path
Rarely "outgrown" — Route 53 scales to essentially any traffic level. The typical migration direction is *into* Route 53 from a simpler DNS provider once multi-region failover or AWS-native routing policies become a real requirement.

### Interview Questions
1. What's the difference between an Alias record and a CNAME, and why does it matter for a zone apex?
2. How does failover routing actually detect that the primary endpoint is unhealthy?
3. What's the tradeoff of setting a very low TTL on a DNS record?
4. When would you use weighted routing versus latency-based routing?
5. What's the difference between a public and a private hosted zone?
6. How would you test that your failover configuration actually works before a real outage happens?
7. Why might a health check be "passing" while the actual application behind it is unhealthy?

### Python Example
```python
import boto3

route53 = boto3.client("route53")

# Alias record pointing directly at an ALB -- resolves to its current IP at query
# time and works at a zone apex, unlike a plain CNAME.
route53.change_resource_record_sets(
    HostedZoneId="Z1234567890ABC",
    ChangeBatch={
        "Changes": [{
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "app.example.com",
                "Type": "A",
                "AliasTarget": {
                    "HostedZoneId": "Z35SXDOTRQ7X7K",  # the ALB's own hosted zone ID
                    "DNSName": "my-alb-1234567890.us-east-1.elb.amazonaws.com",
                    "EvaluateTargetHealth": True,
                },
            },
        }]
    },
)
```
`EvaluateTargetHealth: True` means Route 53 checks the ALB's own target health before resolving to it — a small but meaningful detail that lets DNS-level failover compose correctly with the load balancer's own health-checking rather than the two systems working independently of each other.

### Best Practices
- Prefer Alias records over CNAMEs for any AWS resource target.
- Set TTLs deliberately based on how fast you'd need to react to change, not a default.
- Test failover configurations proactively (a scheduled game-day, not just hoping it works).
- Scope private hosted zones to only the VPCs that need them.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Managed DNS | Route 53 | Azure DNS | Cloud DNS |

---
