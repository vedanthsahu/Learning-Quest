## 40. Async & Queue-Driven Patterns

### 40.1 Pattern: API-Enqueue, Worker-Process

```
Client → API Gateway/ALB → Lambda/Container (validates request, enqueues)
                                    ↓
                              SQS Queue
                                    ↓
                       Worker Fleet (ECS/EC2, scaled on queue depth via companion §23)
                                    ↓
                              RDS/DynamoDB (result persisted)
```
**When to choose this**: the actual work (image processing, report generation, sending a batch of emails) takes long enough that a synchronous HTTP response would time out or feel unacceptably slow to the client, and the client can tolerate "your request was accepted" now, "your result is ready" later. **Tradeoff**: the client needs a mechanism to learn when the work is done — polling an endpoint, a WebSocket push, or an email/notification — adding real design surface the synchronous alternative wouldn't need. **When you'd choose differently**: the work genuinely completes in a timeframe a client can wait for synchronously; adding a queue here is unjustified complexity for no real benefit.

### 40.2 Pattern: Image/File Processing Pipeline

```
Client → S3 (direct upload via presigned URL, companion §4)
              ↓ (S3 Event Notification)
         Lambda (triggered on upload)
              ↓
         Processing (resize, transcode, scan)
              ↓
         S3 (processed result) → CloudFront (serve to clients)
```
**When to choose this**: file processing that's naturally event-driven (react to a specific upload) and independent per-file, needing no coordination across files. **Tradeoff**: processing failures need explicit handling (a dead-letter queue behind the S3-to-Lambda trigger, or a Step Functions wrapper for multi-step processing with retry, companion §20) — an unhandled failure here silently loses the processing step entirely, with the original upload still present but never processed.

### 40.3 Pattern: Fan-Out for Independent Downstream Reactions

```
Producer → SNS Topic (companion §14)
                ↓              ↓              ↓
          SQS Queue A    SQS Queue B    SQS Queue C
          (fulfillment)  (analytics)    (notifications)
```
**When to choose this**: one business event needs multiple, independent systems to react, each at its own pace, with one system's failure/backlog never affecting another's. **Tradeoff**: message schema changes now need to be coordinated across every subscriber, and debugging "did every subscriber actually receive and process this event" requires checking each queue independently rather than one central log. **When you'd choose differently**: subscribers need content-based filtering rather than uniform fan-out — EventBridge (companion §15) fits that shape better.

### 40.4 Decision Guidance
Default to the simplest synchronous pattern (companion §39) until request processing time or a genuine need for independent, isolated downstream reactions justifies the added complexity of a queue. Use SQS point-to-point (§40.1) for single-consumer work distribution; use SNS fan-out (§40.3) or EventBridge (companion §15) once genuinely multiple, independent consumers are the actual requirement.

---
