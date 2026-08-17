## 6. Pattern Matching & Modern Control Flow

### 6.1 The Problem: Branching on the *Shape* of Data, Not Just Its Value

Backend code frequently needs to branch on a message or payload whose structure varies by type — a webhook event that's either a `payment.succeeded`, `payment.failed`, or `payment.refunded` payload, each with different fields; a job-queue message that's one of several distinct command shapes. A chain of `if isinstance(...)` checks followed by manual field extraction, repeated across every branch, is exactly the kind of repetitive, easy-to-get-wrong code that obscures the actual decision being made underneath the boilerplate.

### 6.2 Python Mechanism: `match` Statements Destructure While They Branch

The `match`/`case` statement (structural pattern matching) checks a value against a series of patterns, and — critically — can simultaneously **destructure** the value into named parts as part of matching, rather than matching-then-separately-extracting. A pattern can match a specific type, specific literal values, a sequence's shape, or a mapping's keys, and bind matched sub-parts to names available directly inside that branch's body — collapsing the "check the shape, then extract the fields" two-step into one.

### 6.3 Tradeoff: Pattern Matching vs. a Dictionary of Handler Functions

For simple type-or-value dispatch, `match` is direct and readable. For a large, open-ended, or dynamically-registered set of cases (a plugin system, an extensible event-type registry), a dictionary mapping a discriminator value to a handler function scales better and doesn't require touching a central `match` statement every time a new case is added — the tradeoff is between `match`'s inline readability for a small, fixed, closed set of cases versus a handler-registry's extensibility for a large or open set.

### 6.4 Decision Framework: When Structural Matching Earns Its Keep Over `if`/`elif`

Use `match` specifically when a branch's condition is genuinely about the *shape* of the data (does this dict have this key, does this sequence have exactly two elements, is this object an instance of this specific class) combined with extracting matched pieces for use in that branch — a plain `if`/`elif` chain remains perfectly appropriate, and often clearer, for simple value comparisons that don't need destructuring at all.

### 6.5 Implementation

```python
def handle_webhook_event(event: dict) -> str:
    match event:
        case {"type": "payment.succeeded", "amount": amount, "currency": currency}:
            return f"Payment confirmed: {amount} {currency}"

        case {"type": "payment.failed", "reason": reason}:
            return f"Payment failed: {reason}"

        case {"type": "payment.refunded", "amount": amount, "original_payment_id": pid}:
            return f"Refunded {amount} for original payment {pid}"

        case {"type": event_type}:                 # any other recognized-shape
            return f"Unhandled event type: {event_type}"   # event, captured
                                                              # generically

        case _:                                     # doesn't match ANY case
            return "Malformed event: missing 'type' field"

print(handle_webhook_event({"type": "payment.succeeded", "amount": 4200, "currency": "USD"}))
# -> "Payment confirmed: 4200 USD"
```

Each `case {"type": "...", ...}` both checks that the dict has that specific `"type"` value *and* that the other required keys are present, and binds their values (`amount`, `currency`, `reason`, `pid`) directly as local names inside that branch — no separate `event["amount"]` extraction line needed. The final `case _:` is a catch-all (matches anything), playing the same structural role as a final `else:` — omitting it means an event matching none of the earlier patterns falls through the entire `match` silently, doing nothing, which is almost never the intended behavior for handling an external event.

### 6.6 Production Considerations

A `match` statement with no catch-all `case _:` doesn't raise an error on an unmatched value — it simply does nothing and execution continues after the block, which is a genuinely easy mistake to make for a webhook or event handler where an unrecognized or malformed payload should be logged or rejected, not silently ignored. Always include an explicit `case _:` for any `match` handling external, untrusted, or evolving input, treating "I didn't expect this shape" as a condition worth its own visible handling — directly the same defensive-default principle §1.3's mutable-argument discussion and the companion handbooks' "fail loud, not silent" guidance both apply.

### 6.7 Debugging

**Symptoms:** An event or message that should have triggered some handling appears to be silently dropped — no error, no log entry, just nothing happening. **Investigation:** Check the relevant `match` statement for a missing catch-all case, and check whether the specific payload's shape actually matches any existing `case` pattern exactly (an extra or missing key is enough to fail every pattern). **Root cause:** The payload's shape doesn't match any declared case, and there's no `case _:` to catch and log that fact. **Fix:** Add an explicit catch-all case that logs the unrecognized shape (including the raw payload, for investigation) rather than allowing silent fall-through.

### 6.8 Interview Thinking

A prompt like "parse and handle these different webhook event shapes" is testing whether you reach for structural matching (§6.2) rather than manually writing nested `isinstance`/key-existence checks — but a stronger signal is proactively raising §6.6's silent-fallthrough risk unprompted, since it's the single most common real mistake with this feature in production event-handling code.

### 6.9 Mini Lab

Write a function `parse_job_command(payload: dict) -> str` using `match` that handles at least three distinct command shapes (e.g. `{"action": "send_email", "to": ..., "subject": ...}`, `{"action": "generate_report", "report_type": ...}`, `{"action": "cleanup", "older_than_days": ...}`), each returning a description string built from the destructured fields, plus an explicit catch-all case that returns an "unrecognized command" message rather than falling through silently. Test it against one payload matching each case and one malformed payload.

---
