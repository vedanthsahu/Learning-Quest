## Appendix D: Cross-Reference Index

*This handbook's spiral structure (§0.1.1) means every major topic appears at least three times — once per pass — plus at least once more in Part IV's applied narrative and often again in Part V's encyclopedia. Rather than a raw, unreadable section-to-section link dump, this index maps each of the roughly 24 core subject areas to every section where it appears, in reading order, so you can trace a single topic's full journey through all four passes at once.*

```
TOPIC                          PASS 1    PASS 2    PASS 3    PASS 4 / PART V
--------------------------------------------------------------------------
Foundations/judgment           §1        —         §79.6     §90
Operating Systems              §2        §25       §58       —
Concurrency                    §2.4      §26       §58       §84 (statelessness)
Networking                     §3        §27       §59       §89 (edge auth)
Load Balancing                 §3.3      §28       §60       §84, §86
Backend & APIs                 §4        §29       §60       —
AuthN/AuthZ                    §5        §30       §61       §89; §91 (n/a)
Data Storage foundations       §6        §31       —         §81
Databases (SQL/NoSQL)          §7        §33       §62       §85
Replication                    §8        §34       §63       §82, §86
Sharding                       §8.4      §35       §63       §85, §88
Distributed Systems            §9        §36-38    §64       §87-88
Caching                        §10       §39       §65       §83
Queues / Event-Driven          §11       §40-41    §66       §84, §87
Microservices / DDD            §12       §42       §67       §85-86
Cloud Computing                §13       §43       §68       §89
Containers / Kubernetes        §14       §44-45    §69       —
CI/CD / IaC                    §15       §46-47    §70       §81 (adopted early)
Observability                  §16       §48       §71       §86-87
Security                       §17       §49       §72       §85 (rate limiting)
Performance / Scalability      §18       §50-51    §73       §83-84
Reliability Engineering        §19       §52       §74       §86, §88
Data Pipelines / Streaming     §20       §53       §75       —
Search / Vector DBs            §21       §54       §76       —
AI Infrastructure / LLM        §22       §55       §77       §89 (auth analogy)
Capacity Planning / Cost       §23       §56       §78       §80 (methodology), §89
Incidents / Postmortems        §24       §57       §79       §82, §88
```

### How to Use This Index

If you are debugging a real production issue and only vaguely remember "something about consistent hashing," this index lets you jump directly to §28 (Pass 2 mechanism) without first re-reading §3 (Pass 1 mental model) or §60 (Pass 3 scale) — though if the mechanism itself feels unfamiliar, backing up one column to the left is usually the right move, since each pass assumes the previous one's vocabulary.

If you are studying for a system design interview and want breadth first, read straight down any single column (all of Pass 1, then all of Pass 2, etc.) rather than across a row — this is exactly the reading strategy recommended for that use case in §0.2.

If you are working through Part IV's capstone and want to know which earlier chapter justifies a specific stage decision, the Pass 4 column directly names the stage(s) where each topic was actually applied — cross-check against that stage's own ADR (§81-90) for the specific reasoning.

### Terminology Encyclopedia Cross-References

Every term in Part V (§91.A-E) links back to its mechanism's fuller treatment. The reverse mapping — which encyclopedia entry corresponds to a given mechanism chapter — is:

```
§8.3, §34            -> Split Brain (§91.C), Quorum (§91.C)
§10.3, §39            -> Thundering Herd, Cache Stampede/Avalanche/
                          Penetration (§91.A)
§11.1, §42.4-42.5     -> Cascading Failure, Bulkhead, Circuit Breaker,
                          Backpressure (§91.A, §91.D)
§25.2                 -> Priority Inversion (§91.B)
§26.5                 -> False Sharing (§91.B)
§29.8, §40.2           -> Idempotency, Poison Message, Dead Letter
                          Queue (§91.E)
§31.4                 -> Write Amplification, Read Amplification (§91.E)
§35.3, §63.4           -> Hot Key, Hot Partition (§91.B)
§36-37                -> Epoch, Lease, Leader Election, Lamport Clock,
                          Vector Clock, CRDT, Consensus (§91.C)
§41                   -> Saga, CQRS, Outbox Pattern, Inbox Pattern (§91.D)
§43.2                 -> Cold Start (§91.E)
§50.4, §73             -> Tail Latency, Fan-Out, Scatter-Gather (§91.B, §91.D)
§64.5, §79.5           -> Retry Storm (§91.A)
```

---

*This concludes the appendices and the handbook in its entirety. Every chapter cross-references backward and forward according to the maps in this appendix — a reader who has reached this page has now read a complete, internally-consistent, four-pass treatment of software systems engineering from first principles through hyperscale production practice, applied end-to-end in a single evolving capstone project.*

---
