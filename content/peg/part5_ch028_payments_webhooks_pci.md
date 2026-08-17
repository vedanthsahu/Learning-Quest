## §28. Payments & Webhook Integrations: Signatures, Idempotency Keys, and PCI Awareness

### 1. The Vocabulary

- **Payment processor** (Stripe, PayPal, Adyen) — the third party that actually handles card
  data, so your own system doesn't have to.
- **PCI DSS** — the compliance standard for handling card data; the practical takeaway for most
  teams is "don't touch raw card numbers at all — let the processor's hosted fields/SDK handle
  it," which keeps your own system mostly out of PCI scope.
- **Webhook signature verification** — payment providers sign their webhook payloads (usually
  HMAC); verifying that signature is how you confirm an event genuinely came from them.
- **Idempotency key** (payment-specific) — most payment APIs require one on charge-creation calls
  specifically because double-charging a customer is a uniquely bad failure mode.

### 2. Where It Sits, and Why Teams Use It

Payments are the place where every general lesson about idempotency, webhooks, and async
processing (§22, §26) shows up at once, with real money and real compliance risk attached —
which is exactly why it's worth its own dedicated attention rather than being purely folded into
the general chapters.

### 3. What Actually Breaks

- **Trusting a webhook without verifying its signature** — anyone who discovers your webhook
  endpoint URL can send a fake "payment succeeded" event and get goods/access without paying,
  unless the signature is actually checked.
- **Not using an idempotency key on charge creation** — a client-side retry or a flaky network can
  result in a customer being charged twice for the same order; payment APIs support idempotency
  keys specifically to prevent this, and it has to be wired up deliberately.
- **Relying only on the client-side "success" callback, not the webhook** — a user closing their
  browser tab right after paying but before the success page loads can leave your system thinking
  the payment never completed, even though it did; the webhook is the authoritative source of
  truth, the client-side redirect is just a UX nicety.
- **Storing raw card numbers "just to make refunds easier"** — this is both a severe security risk
  and a PCI compliance violation; refunds should be issued through the processor using their
  stored payment method reference, never your own copy of the card number.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I never store raw card data — the payment processor's hosted fields or SDK exist specifically
  so my system doesn't have to touch it."
- "The webhook, not the client-side redirect, is the authoritative signal that a payment actually
  succeeded."
- "Charge-creation calls get an idempotency key, because double-charging is one of the worst
  possible bugs in a payment flow."

### 5. Interview-Ready Answer

> "Payments are where idempotency and webhook handling actually matter most in practice. I treat
> the payment provider's webhook — signature-verified — as the source of truth for whether a
> payment succeeded, not the client-side redirect, since a user can close their browser before
> that redirect ever fires. And any call that creates a charge gets an idempotency key, because a
> network retry causing a double charge is a much worse outcome than most other duplicate-request
> bugs. For card data itself, I keep my own system out of it entirely and let the processor's SDK
> handle it, both for security and to stay out of PCI scope."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §32 (HTTP Clients & REST Integration) chapter;
this book's own §22 (Idempotency) and §26 (Webhooks) cover the general mechanisms this chapter
specializes.

---
