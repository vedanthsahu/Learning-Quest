## 35. AppSync

> **Decision Snapshot** — Tier 3 · Reference Level · Verdict: know it exists as the managed GraphQL API service, with built-in real-time subscriptions and offline data sync — reach for it specifically when GraphQL, real-time updates, or mobile offline-sync are genuine requirements, not a default alternative to API Gateway.

### What It Does
AppSync provides a managed GraphQL API layer, resolving queries/mutations against Lambda, DynamoDB, RDS, or other data sources, with native support for real-time subscriptions (clients receive live updates when data changes) and offline data synchronization for mobile clients.

### When to Reach for It
Applications genuinely benefiting from GraphQL's client-driven query shape, real-time subscription updates (a live-updating dashboard or chat feature), or mobile apps needing built-in offline-sync conflict resolution.

### When to Avoid It
A standard REST API with no specific need for GraphQL's flexible querying or real-time subscriptions — API Gateway (companion §9) is simpler and more broadly familiar for that shape.

### One Architecture Diagram
```
Client → AppSync (GraphQL API)
              ↓ (resolvers)
        Lambda / DynamoDB / RDS
              ↓ (subscriptions push updates)
        Connected clients (real-time)
```

### Interview Questions
1. When would you choose AppSync/GraphQL over a REST API on API Gateway?
2. How do AppSync subscriptions provide real-time updates without you building custom WebSocket handling?

### Cloud-Agnostic Mapping
AppSync (AWS) ≈ Azure API Management (GraphQL support) (Azure) ≈ Apigee / Cloud Endpoints (GCP) — GraphQL-specific managed services are less standardized across providers than most other categories in this book.

---
