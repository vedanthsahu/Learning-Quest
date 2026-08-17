## 53. Why Did My SQS Queue Back Up?

*(Prerequisite: companion §14 SQS & SNS)*

### 53.1 Symptoms
`ApproximateNumberOfMessagesVisible` grows steadily and doesn't drain, or `ApproximateAgeOfOldestMessage` climbs, even though messages are still arriving at a seemingly normal rate.

### 53.2 Possible Causes
Consumer capacity (worker fleet size or Lambda concurrency) genuinely insufficient for the current message arrival rate; a poison-pill message causing repeated processing failures, consuming worker time on retries without making progress (and, if a dead-letter queue isn't configured, never actually leaving the queue); a downstream dependency (a database, an external API) the consumer calls being slow, reducing the consumer's effective per-message processing throughput; a visibility timeout set too short, causing messages to become visible again and be picked up by a second consumer while the first is still legitimately processing them, inflating apparent queue depth without genuine backlog growth.

### 53.3 Metrics
`ApproximateNumberOfMessagesVisible` (depth) and `ApproximateAgeOfOldestMessage` (how long the oldest unprocessed message has waited) together — depth alone can be misleading if messages are actually processing quickly at high volume; age is the more direct signal of genuine backlog. Dead-letter queue depth, which should normally sit near zero.

### 53.4 Logs
Consumer application logs showing processing errors/exceptions correlated with specific message content (a poison-pill signature) versus generic slowness across all messages (a downstream-dependency or capacity signature).

### 53.5 Investigation
Check dead-letter queue depth first — a nonzero, growing DLQ depth directly indicates messages failing processing repeatedly, distinct from a pure capacity shortfall. If the DLQ is empty but the main queue is backing up, check whether consumer capacity (worker count, Lambda concurrency) has genuinely kept pace with arrival rate, and whether a specific downstream call has slowed down, reducing each consumer's effective throughput.

### 53.6 Root Cause
In practice, the most common causes are: consumer capacity that was sized for average, not peak, arrival rate, and a poison-pill message with no dead-letter queue configured, silently consuming worker capacity in an endless retry loop while contributing nothing to actual backlog reduction.

### 53.7 Fix
For capacity shortfall, scale consumer capacity on queue depth directly (companion §23's exact recommended scaling-metric choice for worker fleets) rather than a proxy metric like CPU. For poison-pill messages, configure a dead-letter queue (companion §14) so a repeatedly-failing message is isolated for investigation rather than looping forever. For a slow downstream dependency, address that dependency's own performance directly — the queue backing up is a downstream symptom, not the actual root cause, in this case.

### 53.8 Tradeoffs
Scaling consumer capacity more aggressively costs more compute during bursts — a real, deliberate tradeoff against faster backlog drain, tuned against how quickly the business actually needs messages processed. A dead-letter queue's messages still need a real investigation/reprocessing workflow — configuring one without a plan for what happens to messages that land there just moves the "who's dealing with this" problem, it doesn't solve it.

### 53.9 Prevention
Configure a dead-letter queue on every production SQS queue from creation, not added reactively after a poison-pill incident. Scale worker/Lambda consumer capacity on queue depth, not CPU, for queue-consuming workloads. Alarm on `ApproximateAgeOfOldestMessage` specifically, not just raw depth, since age is the more direct signal of genuine, growing backlog.

### 53.10 Decision Tree
```
Is the dead-letter queue depth nonzero and growing?
  YES -> A poison-pill or systematically failing message type is the likely cause;
         investigate the DLQ's message content directly.
  NO -> Is ApproximateAgeOfOldestMessage rising alongside queue depth?
    YES -> Genuine backlog; check consumer capacity against arrival rate, and
           check for a slowed-down downstream dependency reducing consumer throughput.
    NO (depth high but age low) -> Likely just high throughput at genuinely high
           volume, not backlog -- confirm this isn't a false alarm before scaling further.
```

---
