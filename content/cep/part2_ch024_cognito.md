## 24. Cognito

> **Decision Snapshot** — Tier 2 · Security · Verdict: the default choice for user authentication (sign-up, sign-in, MFA, social/enterprise identity federation) when you don't want to build and operate that system yourself. Primary alternative: a third-party identity provider (Auth0, Okta) if you need features Cognito doesn't offer or already have an existing relationship.

### One-Line Summary
Managed user authentication and authorization — sign-up/sign-in, MFA, social/SAML federation, and JWT issuance — for your application's end users.

### Category
Security

### Tier
Tier 2

### What It Does
Cognito has two distinct halves, easy to conflate but serving different purposes: **User Pools** are a managed user directory handling sign-up, sign-in, password policies, MFA, and federation with social providers (Google, Facebook) or enterprise SAML/OIDC providers, issuing JWTs on successful authentication. **Identity Pools** (Federated Identities) grant temporary AWS credentials to authenticated (or even unauthenticated/guest) users, letting a mobile or web client access AWS resources (e.g., upload directly to S3) directly, scoped by IAM role, without your backend acting as an intermediary for that specific access.

### When Should I Use User Pools
- You need to authenticate your own application's end users and don't want to build/operate password storage, MFA, and federation yourself.
- The resulting JWTs integrate directly with API Gateway's Cognito authorizer (companion §9) for a clean, native authentication flow.

### When Should I Use Identity Pools
- A client (mobile app, SPA) needs to call AWS services (S3, DynamoDB) directly with scoped, temporary credentials, rather than proxying every such call through your backend.

### When Should I NOT Use Cognito
- You need identity federation features or enterprise integrations Cognito doesn't support, or your organization already has a mature relationship with a third-party identity provider — evaluate the specific gap before defaulting to Cognito reflexively.

### Common Real-World Use Cases
- Sign-up/sign-in for a consumer-facing application, with MFA enabled for account security.
- API Gateway JWT authorization backed by a Cognito User Pool (companion §9's exact example).
- Mobile clients uploading directly to S3 using Identity Pool-issued temporary credentials.

### Typical Architecture
```
Client → Cognito User Pool (sign-in) → JWT issued
              ↓
       API Gateway (JWT authorizer validates token natively) → Lambda
```
The JWT validation happens entirely within API Gateway's native Cognito authorizer integration (companion §9) — no custom authentication code runs as part of handling this request at all, directly avoiding the custom-Lambda-authorizer overhead this book's API Gateway chapter specifically cautions against building unnecessarily.

### Important Concepts
- **User Pools vs. Identity Pools** — authentication (who is this person) versus authorization to call AWS directly (what can this person's client do against AWS) — genuinely different problems, often confused because of the shared product name.
- **Hosted UI** — a Cognito-provided, customizable sign-in page, letting you avoid building your own login UI while still fully controlling branding.
- **Triggers (Lambda)** — Cognito can invoke a Lambda function at specific points (pre-sign-up, post-confirmation, pre-token-generation) for custom validation or enrichment logic without building a separate auth system.
- **Token refresh** — access/ID tokens are short-lived; a longer-lived refresh token obtains new ones without requiring the user to re-authenticate, the same tradeoff pattern companion Python Backend Handbook §80's ADR-2 discusses generally for JWT-based auth.

### Security Considerations
Enable MFA, at minimum as an option and ideally enforced for anything sensitive. Use the pre-token-generation trigger to add custom claims deliberately and narrowly, not broadly. Treat Identity Pool IAM roles with the same least-privilege discipline as any other role (companion §16) — a client-facing role is a genuinely exposed one, since its temporary credentials are, by design, reachable from client-side code.

### Monitoring
CloudWatch metrics for sign-in success/failure rates and Cognito's advanced security features (compromised-credential detection, risk-based adaptive authentication, where enabled) are the primary signals; unusual spikes in failed sign-in attempts are a direct, early indicator of a credential-stuffing attempt worth alarming on.

### Scaling
Cognito scales automatically to large numbers of users and authentication requests with no capacity to provision; the practical constraint is almost never Cognito itself but rather downstream Lambda triggers if they perform slow, synchronous work during the authentication flow.

### Cost Model
Billed per monthly active user (MAU) beyond a free tier, with a Lite/Essentials/Plus feature-tier structure affecting both price and available security features (advanced security features like compromised-credential detection are gated to higher tiers).

### Common Mistakes
- Confusing User Pools and Identity Pools, or using one where the other was actually needed.
- Not enabling MFA for anything beyond the most low-stakes application.
- Performing slow, synchronous work in a Lambda trigger during sign-in, adding latency to every authentication attempt.
- Granting an Identity Pool's authenticated-role broader AWS access than the client genuinely needs, given that role's credentials are inherently client-reachable.

### Migration Path
**From a self-built auth system**: the common direction, given the real cost of building and securing password storage/MFA/federation yourself. **To a third-party IdP**: driven by a genuine feature gap (a specific enterprise SSO protocol, a specific compliance certification) Cognito doesn't cover.

### Interview Questions
1. What's the actual difference between a Cognito User Pool and an Identity Pool?
2. How does a JWT issued by Cognito get validated at API Gateway without custom authentication code?
3. What's a Cognito Lambda trigger, and what's a concrete use case for one?
4. Why is an Identity Pool's authenticated-user IAM role a particularly sensitive one to scope narrowly?
5. What's the tradeoff between access token lifetime and refresh token lifetime?

### Python Example
```python
import boto3

cognito = boto3.client("cognito-idp", region_name="us-east-1")

response = cognito.initiate_auth(
    ClientId="abc123clientid",
    AuthFlow="USER_PASSWORD_AUTH",
    AuthParameters={"USERNAME": "user@example.com", "PASSWORD": "..."},
)
id_token = response["AuthenticationResult"]["IdToken"]
# This id_token is what API Gateway's native JWT authorizer (companion §9) validates
# directly -- no custom verification code needed anywhere in this application.
```
No token-signature verification, expiry check, or claims parsing happens in this application code at all — that entire responsibility is delegated to API Gateway's Cognito-integrated JWT authorizer, directly the pattern companion §9 recommends over a custom Lambda authorizer for this exact identity model.

### Best Practices
- Keep User Pool and Identity Pool responsibilities clearly separated in your design.
- Enforce MFA for anything beyond the lowest-stakes applications.
- Scope Identity Pool IAM roles narrowly, treating them as client-exposed.
- Use native API Gateway JWT authorizer integration rather than custom validation code.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Managed Customer Identity | Cognito | Azure AD B2C | Identity Platform |

---
