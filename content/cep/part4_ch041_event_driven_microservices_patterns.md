## 41. Event-Driven & Microservices Patterns

### 41.1 Pattern: Central Event Bus Microservices

```
Service A → EventBridge (custom bus, companion §15)
                ↓ (rule: matches specific event types)     ↓ (rule: different event types)
          Service B (Lambda/ECS)                     Service C (Lambda/ECS)
                ↓                                            ↓
          Its own database                            Its own database
```
**When to choose this**: a genuine microservices architecture where services should be decoupled — Service A doesn't need to know Service B or C exist, only that it publishes events; new consumers can be added later without changing the publisher at all. **Tradeoff**: debugging a request's full path across services requires distributed tracing (companion §18) and correlation IDs threaded through every event, since there's no single call stack to follow; eventual consistency across services is a real, designed-for property, not a bug — a client checking Service C's state immediately after triggering Service A's action may see stale data briefly.

### 41.2 Pattern: API Gateway as a Service Aggregation Layer

```
Client → API Gateway (single public entry point)
              ↓ /orders/*    → Orders Service (ECS)
              ↓ /inventory/* → Inventory Service (Lambda)
              ↓ /users/*     → Users Service (ECS)
```
**When to choose this**: presenting one coherent public API surface backed by genuinely independent internal services, each ownable and deployable by a different team. **Tradeoff**: this is routing, not a service mesh — cross-service internal communication (Orders calling Inventory directly) still needs its own solution (direct HTTP calls with proper timeouts/circuit breakers, companion Python Backend Handbook §67, or the event-bus pattern above).

### 41.3 Pattern: Saga via Step Functions for Cross-Service Transactions

```
Step Functions: [Reserve Inventory] → [Charge Payment] → [Confirm Order]
                        ↓ (on failure, Catch)                    ↓ (on failure, Catch)
                 [Release Inventory]                    [Refund Payment]
                 (compensating action)                  (compensating action)
```
**When to choose this**: a business process spans multiple services/databases with no single transaction that can wrap all of them (companion Software Systems Handbook's Saga pattern, implemented concretely here via Step Functions, companion §20), and each step needs an explicit compensating action if a later step fails. **Tradeoff**: compensating actions must be designed and tested as carefully as the forward path — an untested rollback path is a common source of a partial-failure incident being worse than the original failure it was meant to recover from.

### 41.4 Decision Guidance
Use a central event bus (§41.1) when services should be decoupled and eventually consistent. Use API Gateway aggregation (§41.2) purely for the public-facing routing concern — it doesn't replace inter-service communication design. Use a Step Functions saga (§41.3) specifically when a business process needs coordinated, multi-service rollback semantics that no single database transaction can provide.

---
