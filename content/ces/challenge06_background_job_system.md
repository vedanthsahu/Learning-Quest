## Project 06: Background Job System

### Problem Statement

Several operations in the application take too long to run inside a normal web request — generating a large report, processing an uploaded video, sending a bulk export. The business wants a way to hand off this kind of work to run separately, so the original request can return quickly, while still guaranteeing the work actually gets done, even if a worker crashes partway through.

### Functional Requirements

- Accept a unit of work ("a job") to be executed later, outside the request that submitted it.
- Execute submitted jobs using one or more worker processes.
- Retry a job that fails due to a transient error, up to a limit.
- Report a job's current status (pending, running, succeeded, failed).

### Non-Functional Requirements

- **Durability**: a job must not be silently lost if the worker processing it crashes mid-execution.
- **No duplicate side effects from retries**: retrying a failed job must not, by itself, cause the job's real-world side effect (e.g., charging a customer) to happen twice.
- **Isolation of failure**: one job that always fails (e.g., due to malformed input) must not prevent other, unrelated jobs from being processed.
- **Visibility**: it should be possible to see how many jobs are pending, and whether the system is keeping up with incoming work or falling behind.

### Project Scope

**In scope**: job submission, durable queuing, worker execution, retry with backoff, status reporting, isolating a permanently-failing job. **Out of scope**: job scheduling for future/recurring execution (that's closer to a cron system, a related but distinct problem), job prioritization beyond simple FIFO, distributed job execution across multiple queue *types*.

### Engineering Questions (Answer Them Yourself First)

- If a worker picks up a job and then crashes before finishing it, how does the system know to give that job to a different worker instead of losing it?
- Is "the job was successfully removed from the queue" the same moment as "the job was successfully completed"? What could go wrong if you conflate these?
- What should happen to a job that fails in a way that will never succeed no matter how many times it's retried (a poison pill)? What happens to jobs behind it in the queue if you don't handle this?
- If your job system guarantees a job runs "at least once" rather than "exactly once," what does that imply about how job-handling code itself needs to be written?

### Architecture Thinking

Sketch what "acknowledging" a job means in your design — at what exact point does a job get marked as no-longer-needing-retry: when a worker picks it up, or when it finishes successfully? Consider the difference between those two points concretely. Sketch what happens to the rest of the queue if job #47 always throws an exception no matter how many times it's retried — does your design let jobs #48 onward continue being processed, or does #47 block everything behind it? Estimate: if jobs take an average of 2 seconds each and arrive at 100 per second, how many workers do you need running concurrently just to keep up, before even considering retries?

### Progressive Hint System

**Level 1**: Consider what "acknowledge" should actually mean — should a job be considered done the moment a worker starts it, or only once it has genuinely finished? **Level 2**: Look into visibility timeouts or acknowledgment mechanisms in message queue systems — what happens if a worker never sends the "I'm done" signal within an expected time? **Level 3**: Research dead-letter queues as a mechanism for isolating jobs that repeatedly fail, and research exponential backoff for retry timing. **Level 4**: A standard design only removes a job from the queue after explicit success acknowledgment from the worker (not merely on pickup); if a worker crashes without acknowledging, the job becomes visible again after a timeout and is retried by another worker; a job that exceeds its maximum retry count is moved to a separate dead-letter queue rather than being retried indefinitely or blocking the main queue.

### Common Engineering Traps

- **Removing a job from the queue as soon as a worker picks it up, before it's actually completed** — what happens to that job if the worker crashes one second later?
- **Writing job-handling logic that assumes it will only ever run once per job** — why is this assumption unsafe given an at-least-once delivery guarantee, and what real bug does it cause under retry?
- **No dead-letter mechanism for a permanently-failing job** — walk through what happens to queue throughput if such a job is retried forever with no escape path.
- **A single global retry policy applied to every job type regardless of what the job actually does** — is a payment-processing job's retry policy the same as a report-generation job's, and should it be?

### Reflection Questions

- How would you distinguish, from monitoring alone, "the system is healthy but momentarily busy" from "the system is falling permanently behind"?
- What test would convince you that your retry logic doesn't cause duplicate side effects for a non-idempotent job?
- If you needed to support job priorities (urgent jobs processed before routine ones), what would have to change about your design?

### Completion Checklist

- [ ] I can explain exactly when a job is considered "safely completed" versus merely "picked up."
- [ ] I have a concrete mechanism for handling a job that fails every single time it's attempted.
- [ ] I understand why job-handling code must tolerate being run more than once for the same job.
- [ ] I have a way to observe whether the queue is keeping up with incoming work.
- [ ] I am ready to compare my reasoning against the Solution Guide.

---
