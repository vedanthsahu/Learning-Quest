## Project 05: Notification Service

### Problem Statement

Several parts of the business need to notify users about things — an order shipped, a password was reset, a friend request arrived — through different channels (email, SMS, push notification). Right now, every team has built their own ad-hoc notification code, leading to inconsistent behavior and duplicated effort. The business wants one central service that any other part of the system can call to send a notification, reliably, through the right channel.

### Functional Requirements

- Accept a request to notify a specific user via a specific channel (or set of channels) with a specific message.
- Actually deliver the notification through the appropriate external provider (an email provider, an SMS gateway, a push notification service).
- Track whether each notification attempt succeeded or failed.
- Support retrying a failed delivery.

### Non-Functional Requirements

- **Isolation between channels**: a failure delivering to one channel must not delay or block delivery to a different channel for the same notification.
- **No duplicate delivery**: a retried notification must not result in the user receiving the same message twice under normal operation.
- **Non-blocking for callers**: whatever part of the system requests a notification should not have to wait for actual delivery to complete before continuing its own work.
- **Provider independence**: switching or adding a new provider for a channel (a new email vendor, for instance) should not require changes to every part of the system that sends notifications.

### Project Scope

**In scope**: accepting notification requests, multi-channel delivery, retry on transient failure, delivery status tracking. **Out of scope**: user notification preferences/opt-outs (acknowledge as a natural future extension), rich templating engines, notification scheduling for future delivery.

### Engineering Questions (Answer Them Yourself First)

- If a notification needs to go to 3 recipients across 2 channels each, is that fundamentally one unit of work, or several? Why does that distinction matter for retry behavior?
- What could cause the exact same notification to be delivered twice to the same recipient, even with retry logic that seems reasonable?
- Why shouldn't the code that decides "an order shipped, notify the customer" also contain the specific logic for calling an email provider's API directly?
- If sending to email succeeds but sending to SMS fails for the same notification request, what should the caller be told happened?

### Architecture Thinking

Sketch what happens when one internal event ("order shipped") needs to become notifications across multiple channels to multiple potential recipients — does a single failure anywhere in that fan-out affect anything else? Consider where "send the actual email" and "decide someone needs to be notified" should live relative to each other — the same system, or different ones communicating asynchronously? Estimate what happens under a provider outage: if your email provider is down for 10 minutes, what happens to the notifications queued during that window, and what happens to unrelated SMS notifications during the same window?

### Progressive Hint System

**Level 1**: Think about what "one task per recipient per channel" versus "one task per notification request" implies for how failures and retries are isolated from each other. **Level 2**: Consider what would prevent a retried delivery attempt from producing a duplicate — does the retry mechanism need help from something outside itself to guarantee this? **Level 3**: Research background task queues and how they support independent, per-task retry policies, and research idempotency keys as a mechanism for making a retried external call safe. **Level 4**: A standard design fans out one independent, queued task per (recipient, channel) pair, each with its own retry policy and its own success/failure tracking; each provider call carries a deterministic idempotency key (often derived from the notification and recipient IDs) so that even a genuine retry-after-ambiguous-failure is deduplicated by the provider rather than relying on the notification service's own retry count alone.

### Common Engineering Traps

- **One task looping over every recipient and channel, retrying the whole task if any single delivery fails** — what happens to the recipients who already succeeded if this whole task is retried?
- **Embedding provider-specific API logic directly in the code that decides to send a notification** — what has to change, and where, if the business switches email providers?
- **Assuming a failed API call means the message definitely wasn't delivered** — is this always true, and what happens if you retry based on that assumption when it's wrong?
- **Notifying a user about their own action** (e.g., notifying someone that they themselves just updated their own profile) — is this always a bug, and how would your design prevent it or allow it deliberately?

### Reflection Questions

- If your service needs to add a fourth channel (say, in-app notifications) six months from now, how much of your existing code would need to change?
- How would you test that a failure in one channel genuinely doesn't affect delivery to a different channel for the same event?
- What's the actual difference between "the notification service confirmed delivery" and "the user actually saw the notification"? Does your design conflate these?

### Completion Checklist

- [ ] I have decided how failures are isolated per recipient and per channel, not just per overall request.
- [ ] I have a specific mechanism preventing duplicate delivery on retry.
- [ ] I can explain how my design allows adding or swapping a provider without touching business-logic code.
- [ ] I have a clear answer for what a caller of my service is told when part of a multi-channel request succeeds and part fails.
- [ ] I am ready to compare my reasoning against the Solution Guide.

---
