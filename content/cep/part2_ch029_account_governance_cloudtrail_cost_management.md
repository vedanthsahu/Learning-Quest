## 29. Account Governance: CloudTrail, Cost Management & Multi-Account Basics

> **Decision Snapshot** — Tier 2 · Governance · Verdict: not optional past a certain organizational size — CloudTrail for audit, Cost Explorer/Budgets for spend visibility, and basic multi-account awareness before a single-account setup becomes an operational liability. Primary alternative: none — these are the governance layer every other service in this book eventually needs once more than one team or environment shares an account.

### One-Line Summary
CloudTrail records every API call for audit; Cost Explorer and Budgets give visibility into and control over spend; basic multi-account structure is how you keep both of those meaningful as an organization grows beyond a single team.

### Category
Governance

### Tier
Tier 2

### What It Does
**CloudTrail** logs every API call made in an account — who (which IAM identity), what action, against which resource, when, and from where — providing the audit trail every other service chapter in this book has referenced when discussing "how would you investigate this." **Cost Explorer** visualizes spend over time, broken down by service/tag/account, identifying trends and anomalies; **Budgets** lets you set spend thresholds with automatic alerts (or even automated actions) when a budget is forecast to be or has been exceeded. Together with **tagging** (a consistent resource-tagging strategy, referenced throughout this book's individual service chapters for cost attribution), these form the minimum governance layer needed to actually answer "who did this" and "why did we spend this much" as an account grows past a single engineer's ability to just remember.

### When Should I Use This
Always, from the very first production account — CloudTrail should be enabled account-wide from day one (it's inexpensive and often free for the management-event tier), and at least one Budget alert should exist before you're surprised by a bill, not after.

### When Multi-Account Structure Becomes Necessary
- More than one team or environment (dev/staging/prod) shares billing and IAM boundaries in ways that make blast-radius containment or cost attribution genuinely difficult.
- Compliance requirements need genuine, enforced isolation between environments or business units, not just naming-convention discipline within one account.

### Common Real-World Use Cases
- Investigating "who deleted this resource, and when" via CloudTrail after an incident.
- Monthly cost review via Cost Explorer, broken down by team/project tag.
- A Budget alert firing before a runaway resource (an oversized, forgotten instance; an unbounded Lambda retry loop) turns into a genuinely large bill.

### Typical Architecture
```
Every AWS API call → CloudTrail (logged, immutable, sent to S3 + optionally CloudWatch Logs)
                                       ↓
                            Athena / OpenSearch (queryable audit investigation)

Resource usage (tagged) → Cost Explorer (visualized, broken down by tag/service/account)
                                       ↓
                                  Budgets (threshold alerts, automated actions)
```
CloudTrail logs shipped to S3 (with Athena, companion §31, querying them directly) is the standard, low-effort way to make months of audit history genuinely searchable without standing up a dedicated log-analytics system just for this purpose.

### Important Concepts
- **Management events vs. data events** — CloudTrail's management events (who created/modified/deleted a resource) are logged by default and largely free; data events (e.g., every individual S3 object read/write) are higher-volume and billed, enabled selectively where that level of detail is genuinely needed.
- **Organization Trail** — a single CloudTrail trail applied across every account in an AWS Organization, ensuring no member account can have logging silently disabled — a real, meaningful governance guarantee once multiple accounts exist.
- **Tagging strategy** — a consistent, enforced set of tags (team, environment, cost-center) applied to every resource is the entire prerequisite for Cost Explorer's breakdowns being meaningful at all; untagged resources show up as an unattributable cost blob.
- **AWS Organizations and Control Tower** — Organizations groups multiple accounts under consolidated billing and centrally-managed policies (Service Control Policies restricting what even an account administrator can do); Control Tower automates setting up a well-architected multi-account "landing zone" — both covered in more design depth in companion §48's Account & Organization Design Guide.

### Security Considerations
Protect CloudTrail logs themselves — an attacker who can delete or tamper with the audit trail undermines the entire point of having one; use an Organization Trail writing to a dedicated, restricted-access logging account (companion §48) rather than a trail living in the same account it's auditing, and enable log file validation to detect tampering.

### Monitoring
Set up CloudWatch Alarms on specific, security-relevant CloudTrail events directly (e.g., root user login, a security group opened to `0.0.0.0/0`) via CloudTrail's integration with CloudWatch Logs and metric filters — genuinely fast, genuinely automatic detection of specific high-risk actions, rather than only discovering them during a periodic manual review.

### Scaling
Neither CloudTrail nor Cost Explorer/Budgets has a meaningful scaling concern at the individual-account level; the real "scaling" challenge is organizational — a tagging strategy and governance model that stays coherent as the number of accounts, teams, and resources grows, which is exactly what a deliberate multi-account structure (companion §48) is designed to keep manageable.

### Cost Model
CloudTrail's management-event logging is free for the first (and typically only) trail per account/region; data-event logging and additional trails have a small per-event cost. Cost Explorer and Budgets are both free — there's no cost-based reason to defer setting up basic spend visibility and alerting.

### Common Mistakes
- Not enabling an Organization Trail, leaving individual member accounts able to silently disable their own logging.
- No tagging strategy at all, making Cost Explorer's breakdowns useless for genuine cost attribution.
- Setting up Budgets only after a surprising bill has already arrived, rather than proactively.
- Storing CloudTrail logs in the same account they audit, without restricted access, weakening the audit trail's tamper-resistance.
- Treating multi-account structure as something to defer indefinitely, until a single account's shared blast radius and unattributable cost become a genuine, painful operational problem.

### Migration Path
**From no governance to basic governance**: enabling an Organization Trail, a consistent tagging strategy, and at least one Budget alert is the minimum viable starting point, achievable in a single account. **From a single account to multi-account**: the natural evolution once team/environment isolation and cost attribution genuinely require it (companion §48 covers this transition directly).

### Interview Questions
1. What's the difference between a CloudTrail management event and a data event?
2. Why should CloudTrail logs be stored in a separate, restricted-access account rather than the account they audit?
3. How does a consistent tagging strategy make Cost Explorer's cost breakdowns actually useful?
4. What's an Organization Trail, and what governance guarantee does it provide that a per-account trail doesn't?
5. How would you set up automatic detection of a specific high-risk action (e.g., root login) rather than relying on periodic manual review?

### Python Example
```python
import boto3

budgets = boto3.client("budgets")

budgets.create_budget(
    AccountId="123456789012",
    Budget={
        "BudgetName": "monthly-production-spend",
        "BudgetLimit": {"Amount": "5000", "Unit": "USD"},
        "TimeUnit": "MONTHLY",
        "BudgetType": "COST",
        "CostFilters": {"TagKeyValue": ["user:Environment$production"]},  # scoped by tag
    },
    NotificationsWithSubscribers=[{
        "Notification": {
            "NotificationType": "FORECASTED",   # alert BEFORE the threshold is actually exceeded
            "ComparisonOperator": "GREATER_THAN",
            "Threshold": 90.0,
        },
        "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "platform-team@example.com"}],
    }],
)
```
`NotificationType: FORECASTED` alerts when spend is *projected* to exceed the threshold before the month ends, not only after it's already happened — giving the team time to investigate and react while the month is still in progress, rather than receiving a purely retrospective alert.

### Best Practices
- Enable an Organization Trail from day one, writing to a dedicated, restricted logging account.
- Establish and enforce a consistent tagging strategy before it's needed for a cost investigation.
- Set Budget alerts on forecasted spend, not just actual spend already incurred.
- Move to a multi-account structure before a single account's shared blast radius becomes a genuine operational problem, not after.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Audit Logging | CloudTrail | Azure Activity Log | Cloud Audit Logs |
| Cost Management | Cost Explorer / Budgets | Azure Cost Management | Cloud Billing Reports / Budgets |
| Multi-Account Management | AWS Organizations | Azure Management Groups | Resource Manager (Folders/Orgs) |

---
