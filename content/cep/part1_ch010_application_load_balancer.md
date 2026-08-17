## 10. Application Load Balancer

> **Decision Snapshot** — Tier 1 · Networking · Verdict: the default load balancer for HTTP/HTTPS traffic to EC2, ECS, EKS, or Lambda targets. Primary alternative: Network Load Balancer (NLB) for non-HTTP TCP/UDP traffic or extreme-low-latency/static-IP requirements.

### One-Line Summary
Layer-7 (HTTP/HTTPS-aware) load balancing across targets, with path/host-based routing, health checks, and TLS termination built in.

### Category
Networking

### Tier
Tier 1

### What It Does
An Application Load Balancer distributes incoming HTTP/HTTPS traffic across a set of registered targets (EC2 instances, ECS/EKS tasks/pods, Lambda functions, or IP addresses directly), routing based on path, hostname, headers, or query strings, terminating TLS, and continuously health-checking targets to route traffic only to healthy ones. Because it operates at Layer 7 (understands HTTP), it can make routing decisions plain TCP load balancing can't — sending `/api/*` to one target group and `/static/*` to another behind the same domain, for instance.

### A Brief Note on NLB
The **Network Load Balancer** operates at Layer 4 (TCP/UDP), with no HTTP awareness — used when you need extreme low latency, a static IP per Availability Zone, or need to load balance non-HTTP protocols. If your traffic is HTTP/HTTPS and you don't have a specific Layer-4-only requirement, ALB is the default; reach for NLB specifically when you hit one of those requirements, not by default.

### When Should I Use It?
- Any HTTP/HTTPS service needing load balancing across multiple targets — the standard front door for EC2/ECS/EKS-hosted applications.
- Path- or host-based routing to different backend services behind one domain.
- TLS termination, offloading certificate management from application servers.

### When Should I NOT Use It?
- Non-HTTP TCP/UDP traffic — use NLB.
- You need a static IP address per AZ (ALB's IPs can change) — use NLB, or put CloudFront/Global Accelerator in front.
- Extremely latency-sensitive traffic where NLB's lower-overhead Layer-4 passthrough matters more than Layer-7 routing features.

### Common Real-World Use Cases
- Front door for containerized microservices, routing by path to different ECS/EKS services.
- TLS termination for a fleet of EC2 instances running plain HTTP behind it.
- Integrating with AWS WAF (companion §27) for edge-adjacent request filtering.

### Typical Architecture
```
Client → ALB (TLS termination, path-based routing)
             ↓                    ↓
      Target Group A        Target Group B
      (/api/* → ECS)        (/admin/* → EC2)
             ↓                    ↓
        Health checks per target, unhealthy targets removed from rotation
```
One ALB commonly fronts several target groups for different services under one domain — the routing rules (path/host-based) are what determine which target group a given request actually reaches.

### Important Concepts
- **Target groups** — the set of registered targets (instances, IPs, Lambda functions) a listener rule routes to, each with its own health-check configuration.
- **Listener rules** — evaluated in priority order, matching on path/host/header/query string, determining which target group handles a request.
- **Health checks** — configurable path, interval, healthy/unhealthy thresholds; a target failing its health check is removed from rotation automatically, without any manual intervention.
- **Sticky sessions** — optional, cookie-based affinity pinning a client to the same target across requests; needed only for genuinely stateful applications that haven't externalized session state (companion Python Backend Handbook §26 on the general problem sticky sessions work around).
- **Cross-zone load balancing** — whether traffic is distributed evenly across all targets in all AZs, or only within the AZ a request arrived in; affects both traffic distribution evenness and (for NLB specifically) cost.

### Security Considerations
Terminate TLS at the ALB using an ACM-issued certificate (free, auto-renewing) rather than managing certificates on individual targets. Attach a security group to the ALB itself, and a separate, more restrictive security group on the targets that only allows traffic from the ALB's security group — never open target ports directly to the internet. Integrate WAF at the ALB for request filtering.

### Monitoring
`TargetResponseTime`, `HTTPCode_Target_4XX/5XX_Count`, `HealthyHostCount`/`UnhealthyHostCount`, and `RequestCount` are the core metrics; a dropping `HealthyHostCount` alongside rising error rates is the direct signal of a deployment or capacity problem, not the ALB itself misbehaving.

### Scaling
ALB scales automatically to handle increasing request volume — there's no capacity to provision on the load balancer side. The scaling constraint is always the target fleet behind it (companion §1/§3's own scaling discussions apply directly here).

### Cost Model
Billed per hour plus Load Balancer Capacity Units (LCUs, a blended metric of new connections, active connections, processed bytes, and rule evaluations) — a load balancer with many complex listener rules or high connection churn costs more than a simple, high-throughput one might expect.

### Common Mistakes
- Opening target security groups directly to the internet instead of scoping them to only accept traffic from the ALB's security group.
- Setting health-check parameters too aggressively (short interval, low failure threshold), flapping targets in and out of rotation under normal, brief latency variance.
- Enabling sticky sessions to paper over an application that hasn't actually externalized session state, rather than fixing the underlying statefulness.
- Choosing NLB by habit or unfamiliarity with ALB, missing out on path-based routing and WAF integration for HTTP traffic that would benefit from them.

### Migration Path
Rarely outgrown at the ALB layer itself — it scales to very high throughput. The typical evolution is adding more target groups and listener rules as an architecture grows more services behind one domain, or introducing a service mesh (at the container-orchestration layer, companion §3) once inter-service routing needs exceed what ALB's path-based rules comfortably express.

### Interview Questions
1. When would you choose an NLB over an ALB?
2. How does path-based routing work, and what's a concrete use case for it?
3. Why should target security groups reference the ALB's security group instead of allowing broader access?
4. What does a health check actually check, and what happens when a target fails it?
5. Why might sticky sessions be a workaround for a deeper application design issue?
6. What's the difference between TargetResponseTime and a client-observed total response time?
7. How would you diagnose a rising 5XX error rate reported at the ALB level?

### Python Example
```python
import boto3

elbv2 = boto3.client("elbv2", region_name="us-east-1")

target_group = elbv2.create_target_group(
    Name="orders-service-tg",
    Protocol="HTTP",
    Port=8000,
    VpcId="vpc-0123456789abcdef0",
    TargetType="ip",             # for ECS/EKS tasks with their own ENIs
    HealthCheckPath="/healthz",
    HealthCheckIntervalSeconds=15,
    HealthyThresholdCount=2,
    UnhealthyThresholdCount=3,   # a bit more forgiving than 2, avoiding health-check flapping
)["TargetGroups"][0]

elbv2.create_rule(
    ListenerArn="arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/my-alb/abc/def",
    Priority=10,
    Conditions=[{"Field": "path-pattern", "Values": ["/orders/*"]}],
    Actions=[{"Type": "forward", "TargetGroupArn": target_group["TargetGroupArn"]}],
)
```
`UnhealthyThresholdCount=3` (rather than the more aggressive minimum of 2) gives a target a bit more tolerance for a brief, transient slow response before being pulled from rotation — directly avoiding the health-check-flapping mistake named above for a service with any normal latency variance.

### Best Practices
- Terminate TLS at the ALB with an ACM certificate; never manage certificates on individual targets.
- Restrict target security groups to only the ALB's security group.
- Tune health-check thresholds to the target's actual, observed latency variance.
- Prefer fixing statelessness over enabling sticky sessions where possible.
- Use path/host-based routing to consolidate multiple services under one domain cleanly.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Layer-7 Load Balancer | Application Load Balancer | Azure Application Gateway | Cloud Load Balancing (HTTP(S)) |

---
