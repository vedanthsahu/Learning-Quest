## 39. Simple Web & API Patterns

### 39.1 The Purpose of This Part

Parts I-III each taught one service in isolation. This Part teaches combinations — the actual shapes a production architecture takes, assembled from the pieces already covered, with the tradeoffs of each shape stated explicitly, not just the diagram.

### 39.2 Pattern: Static Site + Serverless API

```
Client → CloudFront (static assets from S3, cached at the edge)
              ↓ (/api/* routed separately)
         API Gateway → Lambda → DynamoDB / RDS (via RDS Proxy)
```
**When to choose this**: a frontend-heavy application (SPA, static site) with a moderate, bursty, or unpredictable API load, where you don't want to manage any server at all. **Tradeoff**: Lambda cold starts (companion §49) and connection-pool management (companion §50) become real, ongoing concerns as API traffic grows — this pattern's simplicity front-loads cost/operational savings and defers those specific concerns until they actually bite. **When you'd choose differently**: sustained, high, predictable API traffic where a container-based backend (below) would be both cheaper and avoid cold-start variance entirely.

### 39.3 Pattern: Container-Based API Behind a Load Balancer

```
Client → ALB (TLS termination, path-based routing)
              ↓
        ECS/EKS Service (Fargate or EC2 launch type)
              ↓
        RDS/Aurora (direct connection, standard pooling)
```
**When to choose this**: steady, predictable, or high-sustained traffic where paying for always-on compute is more cost-effective than per-invocation serverless billing, or where the application genuinely needs long-running processes/persistent in-memory state Lambda's model doesn't fit. **Tradeoff**: you're now managing container deployment, health checks, and scaling policy (companion §3, §23) — real operational surface Lambda would have removed. **When you'd choose differently**: genuinely bursty, low-average traffic, where §39.2's pattern avoids paying for idle capacity entirely.

### 39.4 Pattern: Multi-Origin CDN Front Door

```
Client → CloudFront (single domain, single TLS cert)
              ↓ /static/* → S3
              ↓ /api/*    → API Gateway or ALB
              ↓ /admin/*  → a separate, more restricted ALB target group
```
**When to choose this**: presenting one public domain backed by genuinely different backend systems (a static frontend, a public API, an internal admin panel needing tighter access control) without managing separate domains/certificates for each. **Tradeoff**: cache-behavior configuration (companion §8) must be deliberately different per path pattern — a shared, undifferentiated cache policy across genuinely different content types is a common source of either over-caching dynamic content or under-caching static content.

### 39.5 Cross-Cutting Consideration: Where Authentication Lives

In every pattern above, authentication should happen as early as possible in the request path — at CloudFront/WAF (companion §27) for edge-level filtering, and at API Gateway/ALB (companion §9, §10) via a Cognito/JWT authorizer (companion §24) before the request ever reaches application compute. Pushing authentication deep into application code, reachable only after Lambda/container compute has already been spent, is a recurring, avoidable cost and security-surface mistake across all three patterns above.

### 39.6 Decision Guidance
Choose §39.2 (serverless) as the default starting point for a new, uncertain-traffic application — it has the lowest fixed cost and operational burden at low-to-moderate scale. Move to §39.3 (containers) once traffic is sustained and predictable enough that steady-state compute pricing beats per-invocation billing, or once Lambda's execution-time/state constraints become a real limitation. Use §39.4's multi-origin approach whenever more than one genuinely distinct backend needs to sit behind one public domain.

---
