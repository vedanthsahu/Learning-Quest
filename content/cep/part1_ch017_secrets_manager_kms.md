## 17. Secrets & Encryption: Secrets Manager & KMS

> **Decision Snapshot** — Tier 1 · Security · Verdict: Secrets Manager for anything an application needs to fetch and use (database credentials, API keys, tokens); KMS for the encryption keys underpinning both Secrets Manager itself and every other service's encryption-at-rest. Primary alternative: Parameter Store (companion §22) for non-secret or lower-cost configuration values that don't need automatic rotation.

### One-Line Summary
Secrets Manager stores and automatically rotates application secrets; KMS creates and manages the encryption keys that protect them (and nearly everything else at rest across AWS).

### Category
Security

### Tier
Tier 1

### What They Do
**Secrets Manager** stores secrets (database credentials, API keys, tokens) encrypted at rest, retrievable by applications via IAM-scoped API calls rather than being baked into configuration files or environment variables at deploy time, and can automatically rotate many secret types (RDS credentials being the most common, fully-native example) on a schedule with zero application downtime. **KMS** (Key Management Service) creates, stores, and controls access to the cryptographic keys used both directly by your application and by nearly every other AWS service's encryption-at-rest feature (S3, EBS, RDS, DynamoDB all use KMS keys under the hood) — every use of a KMS key is independently logged in CloudTrail, giving you an audit trail of exactly when and by what a given key was used, distinct from just "was the data encrypted."

### When Should I Use Secrets Manager
- Database credentials, third-party API keys, or any value an application must authenticate with, especially anything benefiting from automatic rotation.
- Anywhere you'd otherwise be tempted to put a credential in an environment variable or config file at deploy time.

### When Should I Use KMS
- Whenever you need a customer-managed key for a service's encryption-at-rest (rather than accepting the AWS-managed default key), specifically for independently auditable key usage or cross-account key sharing scenarios.
- Application-level encryption of specific sensitive fields before they're even written to a database.

### When Should I NOT Use Secrets Manager (Use Parameter Store Instead)
- Non-secret configuration values (feature flags, non-sensitive settings) — Parameter Store (companion §22) offers a free tier and simpler API for values that don't need rotation.

### Common Real-World Use Cases
- RDS/Aurora credentials with automatic rotation (companion §11's `ManageMasterUserPassword=True` is the direct, native integration point).
- Third-party API keys fetched at application startup (and cached across warm Lambda invocations, companion §2) rather than refetched on every call.
- Customer-managed KMS keys for S3 buckets/EBS volumes/DynamoDB tables holding regulated or specifically sensitive data.

### Typical Architecture
```
Application → Secrets Manager (GetSecretValue, IAM-authorized)
                    ↓ (encrypted at rest by)
                  KMS Key
                    ↓ (automatic rotation, e.g. every 30 days)
              RDS (credential updated on both sides atomically)
```
Automatic rotation for RDS-integrated secrets updates the credential in both Secrets Manager and the database itself as one coordinated operation — the application never sees a window where the two are out of sync, provided it fetches the current secret value on each new connection rather than caching it indefinitely.

### Important Concepts
- **Automatic rotation** — Secrets Manager can invoke a Lambda function (AWS provides native rotation functions for RDS/Aurora/DocumentDB/Redshift) on a schedule, updating the secret and the underlying credential together.
- **Resource policies** — control which principals/accounts can retrieve a given secret, layered on top of standard IAM policy evaluation.
- **KMS key policies vs. grants** — a key policy is the primary access-control document for a key; grants provide temporary, narrower delegated access (e.g., letting a specific service use a key for a specific operation without modifying the key policy itself).
- **Envelope encryption** — KMS doesn't directly encrypt large payloads; it generates a data key (encrypted by the KMS key), which your application uses to encrypt the actual data locally — this is why KMS is fast and cheap even for large data volumes, since the expensive symmetric encryption happens locally, not inside KMS.
- **CloudTrail integration** — every KMS key usage (encrypt, decrypt, generate-data-key) is logged, independent of whether the broader service's own access is logged — a genuinely distinct, valuable audit signal.

### Security Considerations
Prefer customer-managed KMS keys over the AWS-managed default for anything where independently auditable key usage or precise access control matters — the default key's usage is harder to distinguish from unrelated activity in the same account. Never log a secret's value, even at debug level (a surprisingly common, surprisingly severe real mistake). Cache a fetched secret in application memory for the duration it's valid, rather than calling Secrets Manager on every single request — both for cost and to avoid unnecessary dependency load during a Secrets Manager or KMS availability blip.

### Monitoring
CloudTrail is the primary monitoring surface for both — track `GetSecretValue` calls (an unexpected volume or an unexpected caller identity is worth investigating) and KMS `Decrypt`/`GenerateDataKey` calls. Secrets Manager also emits rotation success/failure events worth alarming on directly, since a silently-failing rotation can leave a secret and its underlying credential quietly diverging.

### Scaling
Neither service has a meaningful scaling concern for typical application use — both handle very high request volumes. The practical consideration is request *cost* at very high per-request-fetch volume, which is exactly why caching a fetched secret rather than fetching on every invocation matters (see Common Mistakes).

### Cost Model
Secrets Manager bills per secret stored per month plus per 10,000 API calls; KMS bills per customer-managed key per month plus per request (encrypt/decrypt/generate-data-key). A Lambda function fetching the same secret fresh on every single invocation, rather than caching it across warm starts, is a real, avoidable cost multiplier at high invocation volume, beyond just the added latency.

### Common Mistakes
- Fetching a secret fresh on every application request/invocation instead of caching it for its useful lifetime.
- Logging a secret's value anywhere, even temporarily, even at debug log level.
- Using the AWS-managed default KMS key for everything, losing the independently-auditable, precisely-scoped access control a customer-managed key provides.
- Not monitoring rotation success/failure, discovering a silently-broken rotation only when an application's credentials unexpectedly stop working.
- Storing genuinely non-secret configuration in Secrets Manager instead of the cheaper Parameter Store (companion §22).

### Migration Path
Rarely outgrown — both scale to essentially any application's needs. The typical evolution is moving *toward* customer-managed KMS keys (from AWS-managed defaults) as compliance/audit requirements mature, and moving credentials *into* Secrets Manager (from environment variables/config files) as a security posture matures.

### Interview Questions
1. Why is a secret fetched and cached at application startup preferable to embedding it in an environment variable?
2. How does Secrets Manager's automatic rotation for RDS actually work end to end?
3. What's the difference between a KMS key policy and a grant?
4. What is envelope encryption, and why does KMS use it rather than directly encrypting large payloads?
5. When would you choose a customer-managed KMS key over the AWS-managed default?
6. How would you detect that a secret's automatic rotation silently failed?
7. What's the difference between what Secrets Manager is for and what Parameter Store is for?
8. Why does logging a secret's value at debug level represent a real security incident, not just a minor slip?

### Python Example
```python
import boto3
import json

secrets = boto3.client("secretsmanager", region_name="us-east-1")

_cached_secret = None  # cached across warm Lambda invocations -- never refetched per-request

def get_db_credentials():
    global _cached_secret
    if _cached_secret is None:
        response = secrets.get_secret_value(SecretId="prod/orders-db/credentials")
        _cached_secret = json.loads(response["SecretString"])
    return _cached_secret

def handler(event, context):
    creds = get_db_credentials()   # never logged, never printed, used only to connect
    # ... connect to the database using creds["username"] / creds["password"] ...
```
`_cached_secret` at module scope, checked before making any call to Secrets Manager, directly implements the caching discipline this chapter argues for — the secret is fetched once per warm execution environment, not on every single invocation, exactly mirroring the connection-reuse pattern from companion §2's Lambda chapter.

### Best Practices
- Cache fetched secrets across warm invocations; never fetch on every single request.
- Enable automatic rotation for any secret type Secrets Manager natively supports.
- Use customer-managed KMS keys for anything needing independently auditable usage.
- Never log a secret's value at any log level.
- Use Parameter Store, not Secrets Manager, for non-secret configuration.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Secrets Management | Secrets Manager | Azure Key Vault | Secret Manager |
| Key Management | KMS | Azure Key Vault (Keys) | Cloud KMS |

---
