## Appendix D: Weak Answer vs Strong Answer Bank

*The register this whole book is aiming for, made explicit and paired side by side. A "weak"
answer isn't wrong — it's the sentence you'd say if you only knew the term existed. A "strong"
answer is the sentence you'd say if you'd actually built the thing. If you can rewrite a weak
answer into a strong one on any topic in this book, that's the specific skill this appendix is
drilling. Chapter references point to where the full reasoning lives.*

**IAM (§141)**
- Weak: "IAM manages who can access what."
- Strong: "I use roles for workloads instead of long-lived access keys, scope the permission
  policy to the exact actions and resource ARNs needed, and keep the trust policy — who can assume
  the role — separate from the permission policy — what the role can do."

**S3 privacy (§142)**
- Weak: "Turn on encryption and block public access."
- Strong: "Encryption protects data at rest, but access is controlled separately — Block Public
  Access, the bucket policy, and IAM. For public assets I'd front a private bucket with CloudFront
  and Origin Access Control rather than making the bucket itself public."

**Container deployment (§143)**
- Weak: "Use Docker and deploy to Kubernetes."
- Strong: "Build the image, tag it with a commit SHA, push to ECR, then deploy via an ECS task
  definition and service behind an ALB with real health checks, or an EKS Deployment/Service/
  Ingress if the team's Kubernetes-native — either way, health checks are what make rolling
  deploys and rollback actually safe."

**Bedrock chatbot (§149-150)**
- Weak: "Use Bedrock to call an LLM."
- Strong: "The backend calls Bedrock through an IAM role scoped to InvokeModel, builds the prompt
  from managed conversation history plus any retrieved context, logs token usage and latency per
  stage, and rate-limits the endpoint before any of that — the model call is usually the smallest
  part of the actual engineering."

**Cache stampede (§169)**
- Weak: "The cache expired."
- Strong: "Many concurrent requests missed the same hot key at the same instant and all hit the
  database together; I'd fix it with request coalescing so only one of them actually queries the
  database, plus jittered TTLs so related keys don't expire in the same instant to begin with."

**Microservices (§111)**
- Weak: "We use microservices for scalability."
- Strong: "I'd default to a modular monolith and only split into real services for a concrete
  organizational reason — independent team ownership or genuinely different scaling profiles —
  since a lot of 'microservices' I've seen are actually distributed monoliths sharing a database,
  which gets you the network cost without the independence."

**Rate limiting (§161-162)**
- Weak: "We rate-limit the API."
- Strong: "I use a token bucket so legitimate bursts get through while the sustained rate stays
  capped, enforced as early as possible — ideally the gateway or CDN edge — with the counter backed
  by shared state like Redis so the effective limit doesn't multiply with instance count."

**Async/await bug (§123)**
- Weak: "The endpoint is async so it should be fast."
- Strong: "Async only helps I/O-bound work — the event loop can serve other requests during a
  wait. A single blocking, synchronous call inside that same async function freezes every
  concurrent request on the process, not just the one that made the call, which is the specific
  bug I check for first."

**N+1 / ORM (§30, §127)**
- Weak: "The ORM is slow."
- Strong: "A loop touching a lazy-loaded relationship is issuing one query per item — I'd check
  that first, and fix it with eager loading, since the symptom is invisible with five test rows
  and a real incident with five thousand."

**Split brain / failover (§171)**
- Weak: "We have automatic failover so we're covered."
- Strong: "Failover needs a real quorum check — a naive 'promote myself if I can't reach the
  primary' rule, run independently on both sides of a network partition, is exactly how split
  brain happens, since a majority can't exist on both sides of a partition at once."

**Design patterns, generally (§116-118, §163-164)**
- Weak: "I used the Factory pattern here."
- Strong: "I reached for Factory specifically because callers shouldn't need to know which
  concrete payment provider they're getting — if there were only ever going to be one
  implementation, I'd have skipped the abstraction rather than adding it for the name."

**Saga / distributed transaction (§156)**
- Weak: "We handle the multi-service transaction with a saga."
- Strong: "Each step has an explicit, idempotent compensating action — if payment fails after
  inventory was reserved, a compensation releases that reservation — since there's no single
  distributed transaction to roll back across separately-owned databases."

**Observability alerting (§167)**
- Weak: "We have alerts set up for CPU and memory."
- Strong: "I page on symptoms — error rate, latency against an SLO, a failed critical
  transaction — and keep CPU/memory/queue-depth on dashboards for investigation, since paging on
  every resource threshold trains people to ignore pages, including the real ones."

---
