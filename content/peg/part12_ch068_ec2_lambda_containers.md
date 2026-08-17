## §68. EC2 vs Lambda vs Containers: Picking Compute

### 1. The Vocabulary

- **EC2** — a virtual machine you fully manage: OS, runtime, scaling, patching, everything.
- **Lambda** — a serverless function: upload code, it runs on trigger, the platform manages the
  server entirely; billed per invocation/duration.
- **Containers (ECS/EKS/Fargate)** — a middle ground: package your app as a container, let the
  platform handle scheduling and scaling, but you still control the runtime environment inside
  the container.
- **Cold start** — the extra latency the first invocation (or first invocation after being idle)
  incurs while a serverless function's environment initializes.

### 2. Where It Sits, and Why Teams Use It

This is one of the most common "which one do I actually pick" cloud architecture questions, and
the honest answer is that it depends on workload shape — long-running vs. event-driven,
predictable vs. spiky, needing OS-level control or not.

### 3. What Actually Breaks

- **Lambda for a long-running or steady, high-volume workload** — Lambda has a maximum execution
  duration and can become more expensive than a always-on EC2/container fleet at sustained high
  volume; it shines for short, event-driven, spiky workloads, not steady 24/7 heavy processing.
- **Not accounting for cold starts in a latency-sensitive Lambda-backed API** — a function that's
  been idle can add real, user-visible latency on its next invocation; Provisioned Concurrency
  (kept warm) or choosing a different compute option are the standard mitigations.
- **EC2 chosen "because it's familiar" for a workload that's naturally event-driven and bursty** —
  running a full-time server to handle occasional, unpredictable triggers wastes both money (idle
  capacity) and operational overhead (patching, scaling, monitoring a server that's mostly doing
  nothing) compared to Lambda for that specific shape of workload.
- **Assuming containers are "just Lambda but with Docker" or "just EC2 but easier"** — containers
  genuinely sit in between: more control and longer-running capability than Lambda, less
  infrastructure management than raw EC2, but neither extreme.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I pick based on workload shape: short, event-driven, spiky work fits Lambda; long-running,
  steady, or OS-control-needing work fits EC2 or containers."
- "Lambda cold starts are a real, specific latency cost for latency-sensitive APIs — I'd consider
  Provisioned Concurrency or a different compute choice if that matters."
- "Containers are a genuine middle ground, not just 'Lambda with more steps' or 'EC2 but modern.'"

### 5. Interview-Ready Answer

> "I pick compute based on the actual shape of the workload, not habit. Short, event-driven,
> unpredictable-volume work fits Lambda well, accepting cold-start latency as a real tradeoff for
> latency-sensitive cases. Long-running or steady high-volume processing, or anything needing
> OS-level control, fits EC2 or containers better — and containers specifically give me more
> control than Lambda with less operational burden than raw EC2, which is why they're often the
> default for typical backend services today."

### 6. Go Deeper

companion Cloud Engineering Playbook's §1 (EC2), companion Cloud Engineering Playbook's §2
(Lambda), and companion Cloud Engineering Playbook's §3 (Running Containers on AWS: ECS & EKS)
chapters, and companion Cloud Engineering Playbook's §47 (Hard-Choice Decision Trees) chapter
(EC2 vs ECS vs EKS vs Lambda specifically).

---
