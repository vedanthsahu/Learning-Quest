## 9. API Gateway

> **Decision Snapshot** — Tier 1 · Networking · Verdict: the default front door for a Lambda-backed API, and a strong choice for any API needing built-in throttling, auth integration, and request validation without building that layer yourself. Primary alternative: an ALB if you're fronting containers/EC2 directly and don't need API Gateway's request-shaping features.

### One-Line Summary
A managed front door for APIs — routing, authentication, throttling, request validation, and caching — sitting in front of Lambda, HTTP backends, or other AWS services.

### Category
Networking

### Tier
Tier 1

### What It Does
API Gateway accepts incoming HTTP (or WebSocket) requests and routes them to a backend — most commonly Lambda, but also HTTP endpoints (ALB, a public API) or direct AWS service integrations. Along the way it can validate the request shape, authenticate the caller (via IAM, Cognito, or a custom Lambda authorizer), throttle and rate-limit per client, and cache responses — all without you writing that infrastructure yourself. There are two API types: **REST APIs** (the original, feature-rich option) and **HTTP APIs** (newer, lower latency, lower cost, a smaller feature set) — HTTP APIs are the default choice today unless you specifically need a REST-API-only feature (like usage plans with API keys, or request/response transformation templates).

### When Should I Use It?
- Fronting a Lambda-based API — the natural, default pairing.
- Any API needing built-in throttling/rate-limiting, request validation, or multiple authentication mechanisms without building it into the application itself.
- WebSocket APIs (API Gateway has first-class WebSocket support, routing connect/disconnect/message events to Lambda).

### When Should I NOT Use It?
- Fronting a container/EC2-based service where an ALB alone already provides what you need (path-based routing, health checks) without API Gateway's additional per-request cost and latency.
- Extremely high-throughput, latency-sensitive internal service-to-service calls where the additional hop's latency and cost outweigh API Gateway's request-shaping benefits.

### Common Real-World Use Cases
- Public REST/HTTP APIs backed by Lambda.
- WebSocket-based real-time features (chat, live updates) backed by Lambda.
- A unified API front door aggregating multiple backend services behind one domain and one auth layer.

### Typical Architecture
```
Client → API Gateway (auth, throttling, validation)
              ↓
           Lambda  /  ALB  /  Step Functions  /  another AWS service
              ↓
         RDS / DynamoDB / S3
```
The authentication step (IAM auth, a Cognito User Pool authorizer, or a custom Lambda authorizer) happens at the gateway, before the backend is ever invoked — an unauthenticated or invalid request never consumes Lambda invocation cost or reaches application code at all.

### Important Concepts
- **REST API vs. HTTP API** — HTTP APIs are cheaper, faster, and simpler; REST APIs support usage plans/API keys, request/response transformation (mapping templates), and a few other legacy features HTTP APIs don't (yet) replicate — default to HTTP APIs unless you specifically need one of those.
- **Authorizers** — IAM (SigV4-signed requests), Cognito User Pools (JWT-based), or a custom Lambda authorizer (arbitrary logic, e.g., validating a third-party token) — the choice depends entirely on who your callers are and what identity system they already use.
- **Throttling** — per-account, per-API, and per-client (via usage plans/API keys on REST APIs) rate limits, protecting both your backend and other tenants sharing the same account's limits from one noisy client.
- **Stages and deployments** — an API is deployed to named stages (e.g., `dev`, `prod`), each with its own configuration, enabling safe, independent environment promotion.
- **Request validation** — API Gateway can reject malformed requests (missing required fields, wrong types) against a JSON Schema before the request ever reaches your backend, an early, cheap validation layer.

### Security Considerations
Choose an authorizer matched to your actual caller identity model — don't default to a custom Lambda authorizer for a case Cognito or IAM already solves natively, since custom authorizer code is itself an application you now have to secure and maintain. Enable request validation to reject malformed input before it reaches Lambda. Use resource policies to restrict which VPCs, IPs, or AWS accounts can even reach a private API Gateway endpoint, for internal-only APIs.

### Monitoring
CloudWatch metrics for `4XXError`/`5XXError` rates, `Latency`/`IntegrationLatency` (the split between gateway overhead and backend time is often the fastest way to tell "is this our Lambda or the gateway itself"), and `Count` per stage/method. Access logging (configurable per stage) gives per-request detail beyond the aggregate metrics, valuable during a specific incident investigation.

### Scaling
API Gateway scales automatically to very high request rates with no capacity to provision; the practical limit is almost always the backend (Lambda concurrency, a downstream database) rather than the gateway itself, plus account-level default throttle limits that can be raised via support request if genuinely needed.

### Cost Model
Billed per million API calls (HTTP APIs are meaningfully cheaper per-call than REST APIs) plus data transfer out. Caching (REST APIs only) has its own separate hourly cost based on cache size, worth it only when it genuinely offloads meaningful backend load.

### Common Mistakes
- Defaulting to REST APIs out of habit/older tutorials when HTTP APIs would be cheaper and simpler for the actual requirement.
- Building a custom Lambda authorizer for an identity model Cognito or IAM auth already handles natively.
- Not enabling request validation, letting malformed requests consume a Lambda invocation before failing.
- Ignoring the IntegrationLatency vs. total Latency split, misattributing backend slowness to "API Gateway is slow."

### Migration Path
**Outgrowing it**: extremely high-throughput, latency-critical internal service mesh traffic sometimes moves to direct ALB/service-mesh routing to shave the extra hop — a genuine tradeoff against losing API Gateway's built-in request-shaping features. **Downgrading**: rare — for anything Lambda-backed and public-facing, API Gateway is close to a default, not something typically replaced.

### Interview Questions
1. When would you choose a REST API over an HTTP API on API Gateway, given HTTP APIs are cheaper?
2. How do the three authorizer types (IAM, Cognito, Lambda) differ, and how do you choose?
3. What's the difference between Latency and IntegrationLatency in API Gateway's metrics, and why does that split matter?
4. How does request validation reduce unnecessary Lambda invocations?
5. What's a usage plan, and what problem does it solve that basic throttling doesn't?
6. How would you design a WebSocket API using API Gateway and Lambda?
7. What's the purpose of stages, and how do they support safe environment promotion?

### Python Example
```python
import boto3

apigw = boto3.client("apigatewayv2")  # HTTP API (v2) -- the modern default

api = apigw.create_api(
    Name="orders-api",
    ProtocolType="HTTP",
    Target="arn:aws:lambda:us-east-1:123456789012:function:orders-handler",
)

# JWT authorizer backed by a Cognito User Pool -- no custom auth code to maintain
apigw.create_authorizer(
    ApiId=api["ApiId"],
    AuthorizerType="JWT",
    IdentitySource=["$request.header.Authorization"],
    JwtConfiguration={
        "Audience": ["my-app-client-id"],
        "Issuer": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123",
    },
    Name="cognito-authorizer",
)
```
Using a native `JWT` authorizer against Cognito means there is no custom authentication code running as part of this API at all — the entire validation (signature, expiry, audience) happens inside API Gateway itself before a request ever reaches the Lambda function, directly avoiding the custom-Lambda-authorizer mistake named above where it isn't actually needed.

### Best Practices
- Default to HTTP APIs; justify REST APIs by a specific needed feature, not habit.
- Use native IAM/Cognito authorizers before reaching for a custom Lambda authorizer.
- Enable request validation against a JSON Schema for every endpoint accepting a body.
- Watch IntegrationLatency separately from total Latency when diagnosing slowness.
- Use stages deliberately for environment promotion, not as an afterthought.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| API Gateway | API Gateway | Azure API Management | Apigee / API Gateway |

---
