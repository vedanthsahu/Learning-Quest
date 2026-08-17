## 22. Parameter Store & Systems Manager

> **Decision Snapshot** — Tier 2 · Configuration/Operations · Verdict: Parameter Store for configuration values (secret or not) that don't need automatic rotation; the broader Systems Manager suite for fleet operations (patching, running commands, sessions) without SSH. Primary alternative: Secrets Manager (companion §17) specifically when automatic rotation is a real requirement.

### One-Line Summary
Parameter Store holds configuration values (a free tier for standard parameters, with an advanced tier adding higher throughput and policies); the broader Systems Manager suite adds fleet management — patching, running remote commands, and shell-free instance access.

### Category
Configuration / Operations

### Tier
Tier 2

### What It Does
**Parameter Store** stores key-value configuration — plain strings, string lists, or `SecureString` values encrypted via KMS — retrievable by applications via IAM-scoped API calls, the same fetch-don't-embed discipline as Secrets Manager (companion §17) but without native automatic rotation and, for the standard tier, at no direct cost. **Systems Manager** more broadly includes Session Manager (shell access to an EC2 instance without SSH keys or open inbound ports, logged centrally), Patch Manager (automated OS patching on a schedule), and Run Command (executing a command across a fleet without a hands-on SSH session per instance).

### When Should I Use Parameter Store
- Application configuration values, including secrets that don't need automatic rotation (an API key you rotate manually/infrequently).
- Values shared across many services/environments, organized by a hierarchical naming path.

### When Should I Use Secrets Manager Instead
- Anything benefiting from Secrets Manager's native automatic rotation (RDS credentials being the clearest case, companion §17).

### When Should I Use the Broader Systems Manager Suite
- Any EC2 fleet needing patching, remote command execution, or shell access without managing SSH keys or opening inbound SSH ports at all.

### Common Real-World Use Cases
- Environment-specific configuration (a database endpoint, a feature flag) fetched at application startup.
- Session Manager replacing SSH entirely — no bastion host, no open port 22, full session logging for audit.
- Scheduled patch baselines applied fleet-wide via Patch Manager.

### Typical Architecture
```
Application → Parameter Store (GetParameter, IAM-authorized) → configuration value
                     ↓ (SecureString values decrypted via)
                   KMS

Operator → Systems Manager Session Manager → EC2 instance (no SSH key, no open port 22, session logged)
```
Session Manager's elimination of open inbound SSH ports is a genuine, meaningful security improvement over a traditional bastion-host pattern — there's no port for an attacker to find and attempt to brute-force in the first place.

### Important Concepts
- **Standard vs. Advanced parameters** — standard is free with a lower size limit and no policies; advanced adds larger values, parameter policies (e.g., automatic expiration), and higher throughput, at a small per-parameter cost.
- **Hierarchical naming** — parameters are commonly organized as paths (`/prod/orders-service/db-host`), letting an application fetch an entire configuration tree with one call (`GetParametersByPath`) rather than one call per value.
- **Session Manager** — requires the SSM Agent (present by default on most modern AMIs) and an instance role with the appropriate managed policy; no inbound security group rule is needed at all.

### Security Considerations
Use `SecureString` type for any sensitive value, encrypted via KMS. Scope IAM access to specific parameter paths, not account-wide Parameter Store access. Session Manager sessions can be logged to CloudWatch Logs/S3 for a full audit trail of what commands were run in a session — enable this for anything beyond the most informal environments.

### Monitoring
CloudTrail captures every `GetParameter`/`PutParameter` call; Systems Manager's own compliance dashboards (for Patch Manager) show which instances are up to date versus behind schedule — a genuinely useful, often-underused visibility surface for fleet patch hygiene.

### Scaling
Both scale to essentially any application/fleet size with no capacity concerns; the advanced parameter tier's higher throughput limit exists specifically for applications making very frequent parameter reads at scale.

### Cost Model
Standard parameters are free; advanced parameters and higher-throughput API calls have a small per-parameter/per-call cost. Systems Manager's fleet-management features (Session Manager, Patch Manager, Run Command) are free — you pay only for the underlying EC2 instances they operate on.

### Common Mistakes
- Storing a secret needing automatic rotation in Parameter Store instead of Secrets Manager, then having to build custom rotation logic that already exists natively elsewhere.
- Still running a bastion host with SSH keys and an open port 22 instead of adopting Session Manager.
- Not scoping IAM access to specific parameter paths, granting broader configuration visibility than a given workload needs.

### Migration Path
**To Secrets Manager**: the moment automatic rotation becomes a genuine requirement for a value currently in Parameter Store. **From SSH/bastion hosts**: migrating to Session Manager removes an entire class of open-port/key-management operational burden.

### Interview Questions
1. When would you choose Parameter Store over Secrets Manager for a configuration value?
2. How does Session Manager eliminate the need for a bastion host and open SSH ports?
3. What's the benefit of hierarchical parameter naming and `GetParametersByPath`?
4. Why is centrally logging Session Manager sessions valuable beyond just "it works without SSH"?

### Python Example
```python
import boto3

ssm = boto3.client("ssm", region_name="us-east-1")

# Fetch an entire configuration tree in one call via hierarchical naming
response = ssm.get_parameters_by_path(
    Path="/prod/orders-service/", Recursive=True, WithDecryption=True,
)
config = {p["Name"].split("/")[-1]: p["Value"] for p in response["Parameters"]}
```
`WithDecryption=True` transparently decrypts any `SecureString` values in the path via KMS, and fetching the whole `/prod/orders-service/` tree in one call avoids the N-separate-calls pattern that would otherwise be needed to assemble the same configuration.

### Best Practices
- Use hierarchical parameter naming consistently across environments/services.
- Use `SecureString` for any sensitive value, even in Parameter Store.
- Adopt Session Manager instead of maintaining bastion hosts and SSH key distribution.
- Route anything needing automatic rotation to Secrets Manager instead.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Configuration Store | Parameter Store | Azure App Configuration | Cloud Runtime Configurator |
| Shell-Free Instance Access | Systems Manager Session Manager | Azure Bastion | Identity-Aware Proxy (IAP) |

---
