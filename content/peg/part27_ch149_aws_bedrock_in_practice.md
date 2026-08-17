## §149. AWS Bedrock in Practice

### 1. The Vocabulary

- **Model access** — Bedrock requires explicitly requesting access to each foundation model in
  each region before your account can invoke it — a one-time setup step teams new to Bedrock often
  hit as a confusing first error.
- **InvokeModel / Converse API** — Bedrock's API surface for calling a model; the newer Converse
  API provides a consistent request/response shape across different underlying model providers,
  so switching models requires less code change than provider-specific APIs would.
- **Knowledge Bases** — Bedrock's managed RAG offering: point it at a data source (often S3), and
  it handles chunking, embedding, and retrieval for you, versus building that pipeline yourself
  (§151).
- **Agents** — Bedrock's managed offering for tool-calling/multi-step-reasoning workflows,
  analogous to building an agent loop yourself (§86) but with AWS managing the orchestration.
- **Guardrails** — a managed layer for filtering harmful content, blocking certain topics, and
  redacting sensitive information from both prompts and model responses.

### 2. Where It Sits, and Why Teams Use It

Bedrock's value proposition specifically for an AWS-native team is that permissions, logging, and
billing all flow through infrastructure the team already has: an ECS task's IAM role can be granted
`bedrock:InvokeModel` the same way it might be granted S3 access, calls show up in CloudWatch
alongside everything else, and cost shows up on the same AWS bill. Knowledge Bases and Agents exist
so teams building a chatbot or RAG feature don't need to stand up and operate a separate vector
database and retrieval pipeline themselves, at the cost of less fine-grained control than a
custom-built pipeline.

### 3. What Actually Breaks

- **Forgetting to request model access before calling it** — a very common first error for teams
  new to Bedrock: the IAM permissions can be entirely correct, but the model itself hasn't been
  enabled for the account in that region yet.
- **No CloudWatch logging or cost alarms configured** — token usage and cost can grow quickly and
  invisibly, especially once a feature reaches real user traffic, without explicit monitoring
  wired up (§153).
- **Region mismatch between the model and the calling service** — not every model is available in
  every region; a service calling Bedrock from a region where the specific model isn't enabled
  fails in a way that looks like a permissions problem at first.
- **Treating Guardrails as a complete safety solution** — Guardrails reduce risk but don't replace
  application-level input/output validation and monitoring (§152) — layered defense still applies.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I know Bedrock requires explicit model access per region before the API will work, separate
  from IAM permissions being correct."
- "I'd reach for Bedrock Knowledge Bases and Agents specifically to avoid standing up a custom
  vector-database and orchestration pipeline, understanding that comes with less fine-grained
  control than building it myself."
- "I set up CloudWatch logging and cost monitoring for any Bedrock integration from day one, not
  after the first surprising bill."

### 5. Interview-Ready Answer

> "With Bedrock, the IAM role calling it needs `bedrock:InvokeModel` permission, but that's not
> sufficient on its own — the account also needs explicit model access requested for that model in
> that region, which is a common first stumbling block. Once that's working, I'd log invocations
> and token usage to CloudWatch and set up cost alarms early, since token costs can grow quickly
> and invisibly under real traffic. For a RAG or agent-style feature, I'd evaluate Bedrock's managed
> Knowledge Bases and Agents against building the pipeline myself — the managed option is faster to
> ship but gives up some control over chunking, retrieval, and orchestration details."

### 6. Go Deeper

Neither companion book has a Bedrock-specific chapter; companion Cloud Engineering Playbook's §43
(AI/ML-Serving Patterns) chapter is the closest real architectural reference, and companion Cloud
Engineering Playbook's §38 (SageMaker) chapter covers AWS's other, complementary managed-ML
service; this book's §150-151 (chatbot architecture, RAG flow) for the application-level patterns
Bedrock's managed features implement.

---
