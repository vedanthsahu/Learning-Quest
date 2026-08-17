## 86. Stage 8: Notifications

### 86.1 Stage Goal

Spaces (§81) are collaborative, but nothing currently tells a member when someone else adds a note to a shared space — collaboration without any activity signal is a materially weaker product than what §78.2 actually described. This stage adds notification delivery, built directly on the Celery infrastructure §85 just established.

### 86.2 New Requirements

Functional: when a note is created in a space, every *other* member of that space receives a notification (email, for this stage). Non-functional: a failed notification delivery (a downstream email provider outage) must not affect the note-creation request itself, and must be retried rather than silently dropped — this is precisely the durability requirement §85.3's ADR-7 named as Celery's justification, now actually exercised.

### 86.3 ADR-8: Notify Synchronously-Within-the-Task vs. Fan-Out-Per-Recipient

**(1) Deciding:** Should one Celery task attempt to notify every space member in a loop, or should one task be enqueued *per recipient*? **(2) Options considered:** (a) a single `notify_space_task` that loops over all members and sends each an email within one task execution; (b) a `notify_member_task` enqueued once per recipient, so each recipient's delivery is an independent task. **(3) Tradeoffs:** The single-loop task is simpler to write and enqueue, but a failure partway through the loop (the third of ten recipients' email delivery fails) makes retry semantics ambiguous — retrying the whole task would re-send to the first two recipients as well, a duplicate-notification risk; per-recipient fan-out makes each delivery's success/failure and retry fully independent, at the cost of enqueueing more individual tasks. **(4) Chosen:** Per-recipient fan-out (option b) — notification delivery is exactly the kind of at-least-once, idempotency-sensitive operation (companion §36.5's delivery-guarantee discussion) where conflating multiple recipients' outcomes into a single retryable unit creates a genuine duplicate-send correctness risk, not just an inefficiency. **(5) Revisit when:** Space sizes grow large enough that fan-out task volume itself becomes a scaling concern — at that point, a hybrid (batched fan-out, e.g. ten recipients per task) may be worth reopening this ADR for.

### 86.4 Implementation

```python
@celery_app.task(bind=True, max_retries=5, default_retry_delay=30)
def notify_member_task(self, recipient_email: str, note_title: str, space_name: str) -> None:
    try:
        email_client.send(                                    # companion §32's external HTTP client
            to=recipient_email,
            subject=f"New note in {space_name}",
            body=f'"{note_title}" was added to {space_name}.',
        )
    except EmailProviderError as exc:
        raise self.retry(exc=exc)

@celery_app.task
def fan_out_notifications_task(space_id: str, note_title: str, creator_email: str) -> None:
    with SyncSessionLocal() as session:                        # Celery tasks use a sync session
        space = session.get(SpaceModel, space_id)
        for member in space.members:
            if member.email != creator_email:                  # never notify the note's own creator
                notify_member_task.delay(member.email, note_title, space.name)

# inside create_note, after session.commit():
fan_out_notifications_task.delay(str(space_id), model.title, requester)
```

`fan_out_notifications_task` performs the membership lookup once and enqueues one independent `notify_member_task` per recipient (§86.3's chosen design) — each recipient's delivery success, failure, and retry count are now fully decoupled from every other recipient's, directly closing the duplicate-send risk option (a) carried. Excluding `creator_email` from the fan-out is a small but real product correctness detail — notifying users about their own action would be a bug, not merely an inefficiency.

### 86.5 What Changed in the Architecture

`create_note` gains one additional line (`fan_out_notifications_task.delay(...)`) after the existing `index_note_task.delay(...)` call from §85.4 — two independent background tasks are now enqueued from the same request, each with its own, separately-tuned retry policy (`max_retries=3` for indexing versus `max_retries=5` for notifications, reflecting indexing's self-healing tolerance from §84.3 versus notification delivery's stricter correctness requirement from §86.2).

### 86.6 Production Considerations

Different task types warrant different Celery queue routing (companion §37.5) — indexing and notification-fan-out tasks should not compete for the same worker capacity if one type's volume spikes independently of the other, a refinement not yet implemented in §86.4's code but worth flagging explicitly as a known, deliberately-deferred concern rather than an oversight.

### 86.7 Debugging

**Symptoms:** Notifications are sometimes sent twice to the same recipient for the same note. **Investigation:** Check whether `notify_member_task`'s retry path (triggered by a *transient* `EmailProviderError`) is being invoked after the email provider actually *did* successfully deliver the message — some email providers can time out on the response even after successfully queuing the send, making a naive retry-on-any-exception policy produce a duplicate (companion §32.6's idempotency-key pattern is the general fix). **Root cause:** Retrying an operation whose failure mode doesn't distinguish "never attempted" from "attempted but the confirmation was lost," the exact hazard companion §32.6 names for any retried external call. **Fix:** Pass an idempotency key (a deterministic hash of `recipient_email` + `note_id`) to the email provider's send call if it supports one, so a retried send is safely deduplicated on the provider's side rather than relying on Fieldnote's own retry logic to avoid double-sending.

### 86.8 Mini Lab

Introduce a deliberate, temporary failure in `email_client.send` for exactly one specific recipient in a multi-member space, confirm that only that recipient's `notify_member_task` retries (and eventually succeeds or exhausts retries) while every other recipient's task completes normally and independently — directly verifying ADR-8's core claim that per-recipient fan-out isolates each delivery's outcome.

---
