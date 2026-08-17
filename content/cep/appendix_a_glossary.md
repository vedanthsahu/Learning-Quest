## Appendix A: Glossary

**Alias Record** — A Route 53 record type resolving directly to an AWS resource's current IP at query time; usable at a zone apex, unlike a CNAME (§7).

**ASG (Auto Scaling Group)** — Maintains EC2 fleet size within min/max/desired bounds, replacing unhealthy instances automatically (§23).

**Cache-Aside** — The pattern of checking a cache first, falling through to the source of truth on a miss, and populating the cache for next time (§21, §74).

**CIDR Block** — The IP address range owned by a VPC or subnet (§6).

**Cold Start** — The latency cost of initializing a new Lambda execution environment before it can process an invocation (§2, §49).

**Compute Environment** — A dynamically-sized pool of EC2/Fargate/Spot capacity that AWS Batch runs jobs against (§26).

**Cross-Zone Load Balancing** — Whether a load balancer distributes traffic evenly across all AZs' targets or only within the AZ a request arrived in (§10).

**Data Catalog (Glue)** — A shared schema registry used by Athena, Redshift Spectrum, and Glue ETL jobs (§30, §31).

**Dead-Letter Queue (DLQ)** — A separate queue capturing messages that fail processing repeatedly, preventing an endless retry loop (§14, §53).

**Drift (Infrastructure)** — When real infrastructure diverges from what IaC state/templates describe, usually from a manual out-of-band change (§19).

**Envelope Encryption** — KMS's approach of encrypting a data key (not the payload directly), letting the actual data encryption happen locally and fast (§17).

**Fan-Out** — One message published once, delivered to multiple independent subscribers (§14, §40).

**Fargate** — The serverless compute option for ECS/EKS, removing underlying-instance management entirely (§3).

**Health Check** — A configured probe (path, interval, thresholds) determining whether a target is healthy enough to receive traffic (§10, §23).

**IAM Role** — A temporarily-assumable identity with no long-lived credentials of its own, the preferred alternative to static access keys (§16).

**Idempotency Key** — A caller-supplied identifier letting a retried operation be safely deduplicated rather than processed twice (§14, §53).

**Landing Zone** — A pre-configured, multi-account AWS environment with governance guardrails already applied, commonly provisioned via Control Tower (§48).

**Lifecycle Policy** — Rules automatically transitioning or expiring data as it ages, applicable to S3 storage classes and EFS (§4, §28, §52).

**Multi-AZ** — A synchronous standby database replica in a different Availability Zone, enabling automatic failover (§11).

**NAT Gateway** — Lets private-subnet resources initiate outbound internet traffic without being directly reachable from the internet (§6).

**Origin Access Control (OAC)** — Restricts an S3 (or other) origin to be reachable only through CloudFront, not directly (§8).

**Partition Key** — The DynamoDB attribute determining which physical partition an item lives on, and the basis of most lookups (§13).

**Read Replica** — An asynchronous, eventually-consistent copy of a database for scaling read traffic (§11, §12).

**Rule-Based Routing** — EventBridge's content-based routing of events to targets, distinct from SNS's uniform topic fan-out (§15).

**SCP (Service Control Policy)** — An AWS Organizations guardrail restricting what even an account's own administrators can do (§48).

**Security Group** — A stateful, resource-attached virtual firewall (§6).

**Shard** — A partition of data enabling horizontal scale, used by ElastiCache cluster mode, OpenSearch indices, and Kinesis streams alike (§21, §25, §34).

**Sticky Sessions** — Cookie-based client-to-target affinity at a load balancer, often a workaround for an application that hasn't externalized session state (§10).

**Target Group** — The set of registered targets an ALB listener rule routes to, each with its own health-check configuration (§10).

**Task Definition / Pod Spec** — The declarative description of a container's image, resources, and configuration on ECS or EKS respectively (§3).

**Trust Policy** — The part of an IAM role defining *who* may assume it, distinct from the permission policy defining what it can *do* (§16).

**Visibility Timeout** — How long an SQS message is hidden from other consumers after being received, before becoming visible again if not deleted (§14).

**VPC Endpoint** — Lets private/isolated-subnet resources reach AWS services without routing through the internet or a NAT Gateway (§6).

---
