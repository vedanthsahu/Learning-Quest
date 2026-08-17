## 43. AI/ML-Serving Patterns

### 43.1 Pattern: RAG Backend on AWS

```
Client → API Gateway → Lambda
                            ↓ (retrieve)
                    OpenSearch (companion §25, vector/hybrid search)
                            ↓ (retrieved context)
                    Bedrock/SageMaker Endpoint (companion §38, generate)
                            ↓
                    Response + sources → Client
```
**When to choose this**: a retrieval-augmented generation feature (companion AI Systems Engineering Handbook's full treatment) needing AWS-native retrieval and generation infrastructure. **Tradeoff**: OpenSearch's vector search capability adds real operational overhead (companion §25's shard-sizing and cluster-management concerns) beyond what a simpler keyword-search need would require — confirm the retrieval requirement genuinely needs vector/hybrid search before adopting this specific pattern's full weight.

### 43.2 Pattern: Pre-Built AI Service Pipeline

```
Client uploads document → S3 → Lambda (triggered)
                                     ↓
                              Textract (companion §37, extract fields)
                                     ↓
                              DynamoDB (structured result stored)
```
**When to choose this**: the AI capability needed is already solved by a pre-built service (companion §37) — no custom model, no training pipeline, minimal operational surface. **Tradeoff**: you're constrained to what the pre-built service actually supports; a requirement just outside its capability boundary may need a custom model (§43.3) instead, not a workaround bent around the pre-built service's limits.

### 43.3 Pattern: Custom Model Training & Serving

```
S3 (training data) → SageMaker Training Job (companion §38)
                              ↓
                        Model Registry
                              ↓
                  SageMaker Endpoint ← API Gateway ← Client
```
**When to choose this**: the actual requirement genuinely needs a custom-trained model — validated against companion §37's pre-built services and companion §43.1's foundation-model-based RAG approach first, not defaulted to. **Tradeoff**: this is the most operationally involved of the three patterns here — training data curation, model evaluation, and endpoint capacity planning are all now your team's ongoing responsibility, not a managed service's.

### 43.4 Decision Guidance
Check §43.2 (pre-built services) first — it's the lowest-effort, lowest-risk option whenever it genuinely fits. Reach for §43.1 (RAG) when the requirement is fundamentally about grounding generated answers in your own data. Reach for §43.3 (custom training) only once both of the above have been genuinely ruled out, given its materially higher ongoing operational cost.

---
