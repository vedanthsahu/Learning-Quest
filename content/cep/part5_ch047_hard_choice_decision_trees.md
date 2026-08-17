## 47. Hard-Choice Decision Trees

### 47.1 Purpose

Companion §46's tables answer the easy cases. This chapter is for the genuinely hard ones — where more than one service plausibly fits, and the right answer depends on specifics a simple lookup table can't capture.

### 47.2 EC2 vs. ECS vs. EKS vs. Lambda

```
Is the workload short-lived (minutes) and event-driven?
  YES -> Lambda (§2)
  NO -> Are you already containerizing, or is containerizing worth adopting now?
    NO -> EC2 (§1) -- but ask again once you have more than one or two services
    YES -> Do you need genuine multi-cloud/on-prem Kubernetes portability, or
           existing deep Kubernetes expertise/tooling investment?
      YES -> EKS (§3)
      NO -> ECS (§3) -- the lower-operational-overhead default for AWS-only teams
```
**The trap to avoid**: choosing EKS for its ecosystem prestige without a genuine portability or existing-expertise reason — its added operational surface (companion §3) is a real, ongoing cost that should be justified, not assumed.

### 47.3 RDS vs. Aurora vs. DynamoDB

```
Do you know your access patterns precisely, need effectively unlimited horizontal
scale, and can design around key-value/single-table modeling (companion §13)?
  YES -> DynamoDB
  NO -> Do you need more than a few low-lag read replicas, faster failover than
        standard Multi-AZ, or storage beyond what a single RDS instance comfortably handles?
    YES -> Aurora (§12)
    NO -> RDS (§11) -- the correct default for standard relational needs
```
**The trap to avoid**: choosing DynamoDB because "it scales infinitely" for a workload whose actual access patterns are varied and ad hoc — this produces a schema that has to be redesigned later, not a scaling win (companion §13's Common Mistakes names this directly).

### 47.4 SQS vs. SNS vs. EventBridge

```
Does exactly one consumer need to process each message, at its own pace?
  YES -> SQS (§14)
  NO -> Do all subscribers want every message uniformly, with no content-based filtering need?
    YES -> SNS (§14), commonly with SQS queues as subscribers for fan-out
    NO -> EventBridge (§15) -- content-based routing to different targets per event type
```
**The trap to avoid**: building elaborate SNS subscription filter policies to approximate what EventBridge's rule-based routing does natively and more clearly (companion §15's Common Mistakes).

### 47.5 API Gateway vs. ALB vs. CloudFront + Lambda@Edge

```
Is the backend Lambda functions specifically, needing request validation/throttling/
auth built in?
  YES -> API Gateway (§9)
  NO -> Is the backend containers/EC2, needing path-based routing and health checks?
    YES -> Application Load Balancer (§10)
    NO -> Do you need to modify requests/responses at the edge, geographically
          close to users, before they reach any origin?
      YES -> CloudFront + Lambda@Edge/CloudFront Functions (§8)
```
**The trap to avoid**: defaulting to API Gateway out of habit for a container-backed service where ALB alone is simpler and sufficient (companion §9's own guidance on this exact overlap).

### 47.6 Standard vs. FIFO SQS, or SQS vs. Kinesis

```
Do you need strict message ordering and exactly-once processing within a group?
  YES -> FIFO SQS queue (§14), accepting its lower throughput ceiling
  NO -> Is this a high-volume stream needing multiple independent consumers,
        replay, and ordered-by-partition-key semantics?
    YES -> Kinesis (§34)
    NO -> Standard SQS (§14) -- the simpler default
```

### 47.7 Single Account vs. Multi-Account

```
Does more than one team/environment share this account's billing and IAM boundaries
in a way that makes cost attribution or blast-radius containment genuinely difficult?
  YES -> Move to multi-account (companion §48)
  NO -> A single, well-governed account (companion §29) is proportionate for now --
        revisit as the organization grows, not preemptively
```
**The trap to avoid**: over-engineering a multi-account landing zone for a two-person team's side project — proportionality (companion Python Backend Handbook §108.10's principle, applied here) cuts both ways.

### 47.8 How to Use This Chapter

Each tree here resolves a genuinely common point of hesitation by naming the *specific factor* that should actually decide it — not "it depends," but which concrete question to ask yourself. Where a tree's answer still feels ambiguous after walking through it, that's a signal the actual requirements aren't yet clear enough to make this decision responsibly — go clarify the requirement, not the tool choice.

---
