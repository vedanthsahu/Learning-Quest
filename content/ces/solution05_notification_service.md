## Project 05: Notification Service — Solution Guide

### Business Reasoning

The business need is consolidating scattered, duplicated notification logic into one reliable, centrally-owned service. The genuine engineering challenge is that "send a notification" is deceptively plural — one request can fan out to multiple recipients across multiple channels, each with independent success/failure, and treating this fan-out as a single atomic unit produces exactly the kind of partial-failure confusion the challenge's engineering questions probe.

### Requirements Analysis

The core tension is between simplicity (one request, one task) and correctness under partial failure (isolating each recipient-channel pair's outcome). The non-functional requirement that a channel failure not block other channels, combined with the no-duplicate-delivery requirement, together rule out any design that treats a multi-recipient, multi-channel request as one indivisible retry unit.

### Architecture

```
Notification request -> [fan-out: one task per (recipient, channel) pair]
  -> Channel-specific worker -> Provider adapter (email/SMS/push) -> external provider API
  -> delivery status recorded per (recipient, channel) pair independently
```

### Tradeoff Discussion

**Single looping task vs. per-recipient-per-channel fan-out.** A single task looping over every recipient and channel is simpler to write and enqueue, but a failure partway through makes retry semantics ambiguous — retrying the whole task risks re-sending to recipients who already succeeded, a direct duplicate-delivery risk. Per-recipient-per-channel fan-out makes every individual delivery's success, failure, and retry fully independent, at the cost of enqueuing more individual tasks — a cost that's genuinely small relative to the correctness this buys.

**Provider logic location.** Embedding a specific provider's API calls directly in business logic (e.g., inside "an order shipped" event handling) couples that business logic to one specific vendor's API shape; a provider-adapter layer (a small, channel-specific interface that business logic calls generically, with the specific provider swappable behind it) decouples the two, at the cost of one additional abstraction layer to maintain.

### Alternative Designs Considered and Rejected

**Synchronous delivery within the request that triggers the notification.** Rejected — this directly violates the non-blocking-for-callers requirement, and ties the caller's own success to an unrelated external provider's availability and latency. **A single message queue topic with one consumer handling all channels.** Rejected as the primary design — different channels have meaningfully different latency, failure, and rate-limit characteristics (SMS providers often have stricter rate limits than email), and coupling them into one consumer means a slow or rate-limited channel can starve throughput for a faster one.

### Chosen Design

An ingestion API that fans out one independent task per (recipient, channel) pair into a durable task queue; channel-specific worker pools (one pool type per channel) each pull from their own queue and call a thin provider-adapter interface; every delivery attempt carries a deterministic idempotency key derived from the notification ID and recipient, passed to the provider where supported.

### Implementation Walkthrough

```python
class ChannelProvider(Protocol):                 # a Protocol, not a concrete class (Python
    async def send(self, recipient: str, message: str, idempotency_key: str) -> None: ...
                                                  # Backend Handbook §4.5's structural typing)

class EmailProvider:
    async def send(self, recipient, message, idempotency_key):
        await email_client.send(to=recipient, body=message, idempotency_key=idempotency_key)

class SmsProvider:
    async def send(self, recipient, message, idempotency_key):
        await sms_client.send(to=recipient, text=message, dedup_key=idempotency_key)

PROVIDERS: dict[str, ChannelProvider] = {"email": EmailProvider(), "sms": SmsProvider()}

@celery_app.task(bind=True, max_retries=5, default_retry_delay=30)
def deliver_task(self, notification_id: str, recipient: str, channel: str, message: str):
    idempotency_key = f"{notification_id}:{recipient}:{channel}"
    try:
        PROVIDERS[channel].send(recipient, message, idempotency_key)
        record_delivery_status(notification_id, recipient, channel, "delivered")
    except ProviderError as exc:
        record_delivery_status(notification_id, recipient, channel, "retrying")
        raise self.retry(exc=exc)

def notify(notification_id: str, recipients: list[str], channels: list[str], message: str):
    for recipient in recipients:
        for channel in channels:
            deliver_task.delay(notification_id, recipient, channel, message)   # independent tasks
```

The `ChannelProvider` Protocol means business logic (`notify`) never references a specific vendor's API — swapping `EmailProvider`'s internal implementation, or adding a `PushProvider`, requires zero changes to `notify` or `deliver_task`, directly resolving the challenge's provider-independence requirement. Each `(recipient, channel)` pair is its own independent Celery task with its own retry count and status, directly closing the challenge's first named trap.

### Production Improvements

Add a notification-preferences check before fan-out (explicitly deferred in Project Scope, but the fan-out structure already accommodates it cleanly — filter the recipient/channel list before enqueueing). Add per-channel rate-limit awareness in each provider adapter, since SMS providers in particular often enforce strict sender-side rate limits distinct from this series' Project 02 rate limiter's inbound-request focus.

### Scaling Path

Each channel's worker pool scales independently based on that channel's own volume and provider rate limits — exactly the independent-scaling reasoning Python Backend Engineering Handbook §91.3's ADR-13 applies to the capstone's web-versus-worker tiers, generalized here to per-channel worker tiers.

### Interview Discussion

See Python Backend Engineering Handbook §95.1 for this exact system walked through the five-phase interview framework, and §86 for a closely related, fully-implemented version embedded in the handbook's own Fieldnote capstone.

### Lessons Learned

The core lesson is that "isolate failures at the right granularity" is a genuine design decision, not a default — choosing per-(recipient, channel) task granularity, rather than per-request, is what makes partial failure survivable and retryable without duplicate-delivery risk. This same granularity-of-isolation question recurs in Project 06 (Background Job System) and Project 07 (API Gateway).

---
