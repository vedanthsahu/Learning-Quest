## 27. Edge Security: WAF & Shield

> **Decision Snapshot** — Tier 2 · Security · Verdict: WAF for filtering malicious/unwanted requests (SQLi, XSS, bot traffic, rate-based rules) at CloudFront/ALB/API Gateway; Shield for DDoS protection, with Shield Standard automatically included for every AWS customer at no cost. Primary alternative: none for baseline DDoS protection — Shield Standard is not optional, it's always on.

### One-Line Summary
WAF filters HTTP requests against rules (SQL injection, XSS, rate limiting, bot control) at the edge; Shield protects against DDoS attacks, with a free baseline tier for everyone and an advanced paid tier for additional protection and cost protection during large attacks.

### Category
Security

### Tier
Tier 2

### What They Do
**WAF** (Web Application Firewall) evaluates incoming requests at CloudFront, ALB, API Gateway, or AppSync against a Web ACL — a set of rules matching on request attributes (IP, headers, body content, geographic origin) plus AWS Managed Rule Groups (pre-built rule sets for common threats like SQL injection and known bad bot signatures) — allowing, blocking, or counting matching requests. **Shield Standard** is automatically active for every AWS customer, providing baseline protection against common network/transport-layer DDoS attacks at no additional cost. **Shield Advanced** (a paid, opt-in tier) adds more sophisticated attack detection, 24/7 access to AWS's DDoS response team, and — notably — cost protection against scaling charges incurred specifically because of a DDoS attack.

### When Should I Use WAF
- Any public-facing CloudFront distribution, ALB, or API Gateway, especially anything handling user input directly (forms, search, APIs accepting a request body).
- Rate-based rules to throttle abusive clients at the edge, before they ever reach your application (complementing, not replacing, application-level rate limiting, companion Python Backend Handbook §61).

### When Should I Use Shield Advanced
- Business-critical, internet-facing applications where DDoS-driven downtime or the resulting cost spike (from auto-scaling reacting to attack traffic) is a genuine, material business risk.

### When Should I NOT Bother With Shield Advanced
- Internal-only or genuinely low-stakes applications where Shield Standard's automatic baseline protection is proportionate to the actual risk.

### Common Real-World Use Cases
- WAF Managed Rule Groups blocking common web exploits (SQLi, XSS) at CloudFront before they reach the origin.
- Rate-based WAF rules mitigating credential-stuffing or scraping attempts.
- Shield Advanced for e-commerce or financial applications where downtime has a direct, quantifiable revenue impact.

### Typical Architecture
```
Internet → Shield (DDoS protection, always-on baseline)
               ↓
           CloudFront / ALB / API Gateway
               ↓
           WAF Web ACL (rules evaluated per request)
               ↓ (allowed)          ↓ (blocked/counted)
           Origin                Request rejected, never reaches origin
```
WAF's evaluation happens before a request ever reaches your origin — a blocked request never consumes application compute, database connections, or any downstream resource at all, which is a meaningfully different (and cheaper, and safer) posture than filtering the same request inside application code after it's already been fully received and routed.

### Important Concepts
- **Web ACLs and rule groups** — a Web ACL is an ordered set of rules (custom rules plus AWS or Marketplace Managed Rule Groups) evaluated per request; rule order and default action (allow/block) matter, since rules are evaluated in sequence.
- **Rate-based rules** — automatically block/challenge an IP (or other key) exceeding a request-rate threshold within a rolling time window — the edge-level complement to application-level rate limiting, catching abuse before it consumes any application resources at all.
- **Bot Control** — an AWS Managed Rule Group specifically identifying and optionally challenging/blocking known bot traffic patterns.
- **Shield Advanced's cost protection** — specifically reimburses scaling-related cost increases (e.g., additional CloudFront/ALB/EC2 usage charges) directly attributable to a detected DDoS attack, a distinctive feature beyond the attack mitigation itself.

### Security Considerations
Start new WAF rules in "count" mode before switching to "block," to validate they don't inadvertently block legitimate traffic — a rule that's too aggressive can cause a real, self-inflicted availability incident. Layer WAF at every public entry point (CloudFront, ALB, API Gateway) consistently, not just one.

### Monitoring
WAF's sampled request logs and CloudWatch metrics show which rules are matching and how often; a sudden spike in blocked requests from a specific rule is worth investigating both as a potential attack and as a potential false-positive against legitimate traffic.

### Scaling
Both scale automatically to handle very high traffic/attack volumes with no capacity provisioning required — this is precisely the point of an edge-level, managed defense versus attempting to absorb and filter the same volume within application infrastructure.

### Cost Model
WAF bills per Web ACL per month, per rule, and per million requests evaluated. Shield Standard is free; Shield Advanced has a significant fixed monthly cost (typically justified only for genuinely business-critical, high-value applications) plus a one-year commitment.

### Common Mistakes
- Deploying a new WAF rule directly in "block" mode without first validating it in "count" mode, causing an availability incident from blocked legitimate traffic.
- Applying WAF at CloudFront but not at a directly-exposed ALB/API Gateway behind it, leaving a bypass path.
- Assuming Shield Standard's automatic baseline protection is sufficient for a genuinely business-critical application without evaluating whether Shield Advanced's additional protections and cost coverage are warranted.
- Relying on WAF alone for rate limiting without also implementing application-level limits (companion Python Backend Handbook §61) for logic WAF's request-level view can't express.

### Migration Path
Rarely outgrown — both scale to essentially any legitimate traffic and attack volume. The typical evolution is adding more refined custom rules over time as specific attack patterns are observed, and moving to Shield Advanced as an application's business criticality grows.

### Interview Questions
1. Why is starting a new WAF rule in "count" mode before "block" mode a genuinely important practice?
2. What's the difference between Shield Standard and Shield Advanced, concretely?
3. How does a rate-based WAF rule complement, rather than replace, application-level rate limiting?
4. Why should WAF be applied consistently at every public entry point, not just the CDN layer?
5. What does Shield Advanced's cost protection specifically cover?

### Python Example
```python
import boto3

wafv2 = boto3.client("wafv2", region_name="us-east-1")

wafv2.create_web_acl(
    Name="app-protection",
    Scope="CLOUDFRONT",
    DefaultAction={"Allow": {}},
    Rules=[
        {
            "Name": "AWS-AWSManagedRulesSQLiRuleSet",
            "Priority": 1,
            "OverrideAction": {"None": {}},   # enforce the managed rule's own block action
            "Statement": {"ManagedRuleGroupStatement": {"VendorName": "AWS", "Name": "AWSManagedRulesSQLiRuleSet"}},
            "VisibilityConfig": {"SampledRequestsEnabled": True, "CloudWatchMetricsEnabled": True, "MetricName": "sqli-rule"},
        },
        {
            "Name": "rate-limit-per-ip",
            "Priority": 2,
            "Action": {"Block": {}},
            "Statement": {"RateBasedStatement": {"Limit": 2000, "AggregateKeyType": "IP"}},
            "VisibilityConfig": {"SampledRequestsEnabled": True, "CloudWatchMetricsEnabled": True, "MetricName": "rate-limit"},
        },
    ],
    VisibilityConfig={"SampledRequestsEnabled": True, "CloudWatchMetricsEnabled": True, "MetricName": "app-protection"},
)
```
The AWS Managed SQLi rule set is included and enforced (`OverrideAction: None`) rather than reimplemented from scratch, and the rate-based rule blocks any single IP exceeding 2,000 requests within the rolling evaluation window — both operating entirely at the edge, before any request reaches the origin application at all.

### Best Practices
- Validate new rules in count mode before switching to block.
- Apply WAF consistently across every public entry point, not just the CDN.
- Use AWS Managed Rule Groups as a baseline; add custom rules for application-specific threats.
- Evaluate Shield Advanced specifically for business-critical, high-value applications.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Web Application Firewall | WAF | Azure WAF | Cloud Armor |
| DDoS Protection | Shield | Azure DDoS Protection | Cloud Armor (DDoS features) |

---
