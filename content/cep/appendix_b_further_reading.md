## Appendix B: Further Reading & Primary Sources

### B.1 How to Use This Appendix

This book deliberately avoids re-deriving first principles the companion Software Systems Engineering Handbook already covers, and avoids restating AWS's own documentation. This appendix points to primary sources worth reading directly once a specific chapter's summary isn't enough — official documentation, AWS's own architectural guidance, and the broader engineering literature this book draws on.

### B.2 Foundational AWS Architectural Guidance

The **AWS Well-Architected Framework** (six pillars: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, Sustainability) is the primary source underlying much of this book's "when to use / when not to use" framing, worth reading directly for the fuller reasoning behind AWS's own architectural recommendations. The **AWS Architecture Center**'s reference architectures are a direct complement to companion Part IV's pattern catalog, showing additional worked examples beyond what this book's own space allows.

### B.3 Compute (Part I-II)

AWS's own EC2 instance type documentation, updated far more frequently than any book can track, is the authoritative source for current instance family characteristics (companion §1). The Lambda documentation's "Understanding Lambda function scaling" page is the primary source behind companion §2 and §49's cold-start/concurrency discussion. The ECS and EKS "Best Practices Guides" (both maintained directly by AWS) are worth reading in full for teams operationalizing companion §3 at real scale.

### B.4 Databases (Part I-II)

The Aurora storage architecture whitepaper is the primary source behind companion §12's replication-lag and fast-failover claims. The DynamoDB "Best Practices for Designing and Using Partition Keys" documentation page is required reading before any real single-table design effort (companion §13).

### B.5 Networking & Security (Part I-II)

The VPC documentation's "VPC Design" whitepaper is the deeper source behind companion §6. The IAM "Security Best Practices" documentation page underlies companion §16 and is worth reading in full — it's updated as AWS's own recommended practices evolve. The OWASP Top 10 (companion Python Backend Engineering Handbook §63's own full treatment) is the relevant primary source behind the injection/XSS rule categories companion §27's WAF Managed Rule Groups implement.

### B.6 Messaging & Event-Driven Architecture (Part I-II, Part IV)

Gregor Hohpe and Bobby Woolf's *Enterprise Integration Patterns* remains the standard deeper reference for the messaging patterns (fan-out, dead-letter queues, content-based routing) companion §14, §15, and §40-41 apply concretely to AWS services. The companion Software Systems Engineering Handbook's own messaging and event-driven architecture chapters cover the underlying theory this book's AWS-specific chapters assume.

### B.7 Observability (Part I)

The OpenTelemetry project's documentation is the vendor-neutral instrumentation reference underlying companion §18's discussion of migrating toward a third-party APM without re-instrumenting application code — directly relevant background for any team layering tooling on top of or instead of CloudWatch/X-Ray.

### B.8 AI/ML on AWS (Part III-IV)

The companion **AI Systems Engineering Handbook** is the primary, deeper reference for everything this book's §37, §38, and §43 touch only at the AWS-service-integration level — RAG architecture, prompt engineering, evaluation, and production AI operations are covered there in full depth, not repeated here.

### B.9 Cost Optimization & FinOps (Part II, Part IV-V)

The FinOps Foundation's published framework and terminology is the primary source behind companion §29 and §45's cost-governance discussion, and is the standard reference for organizations building a dedicated cost-optimization practice beyond this book's own introductory treatment.

### B.10 Multi-Account & Organization Design (Part V)

AWS's own "Organizing Your AWS Environment Using Multiple Accounts" whitepaper is the authoritative, considerably more detailed source behind companion §48's account-structure guidance.

### B.11 re:Invent Talks Worth Watching

AWS re:Invent's annual conference talks (freely available on YouTube) are, in practice, where much of AWS's own deepest operational guidance is first published — search for the specific service name plus "deep dive" or "best practices" for the most current, detailed guidance on any Tier 1/2 service in this book, since re:Invent content is updated yearly in a way no static book can match.

---
