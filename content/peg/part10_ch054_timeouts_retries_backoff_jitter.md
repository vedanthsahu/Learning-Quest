## §54. Timeouts, Retries, Backoff, and Jitter (the Core Four)

### 1. The Vocabulary

- **Timeout** — how long to wait for a response before giving up and treating the call as failed.
- **Retry** — trying the failed call again.
- **Exponential backoff** — waiting progressively longer between each retry (1s, 2s, 4s, 8s...)
  instead of a fixed delay.
- **Jitter** — adding randomness to the backoff delay so many clients retrying the same failing
  dependency don't all retry at the exact same synchronized moment.

### 2. Where It Sits, and Why Teams Use It

These four ideas are the basic, reusable toolkit for handling *any* call to something that might
be slow or temporarily unavailable — a database, an external API, another internal service. They
show up in nearly every reliability pattern in this book in some form.

### 3. What Actually Breaks

- **No timeout at all** — a call to a hung dependency can block indefinitely, tying up resources
  (a thread, a connection) forever instead of failing fast and freeing them up.
- **Timeout set too aggressively short** — a call that would have succeeded in 2 seconds gets
  killed at 1 second and retried, adding load rather than reducing it, especially if the original
  call was still processing server-side even after the client gave up.
- **Retrying without backoff** — an immediate, tight retry loop against a struggling dependency
  adds load at exactly the worst time, making recovery slower, not faster.
- **Backoff without jitter** — if many clients all fail at the same moment and all back off by
  the exact same schedule, they all retry in synchronized waves, hitting the recovering service
  with spikes instead of a smooth trickle.
- **Retrying something that isn't safe to retry** — retrying a non-idempotent operation (§22) can
  create duplicates; the "core four" here assume the operation being retried is safe to repeat.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Every external call gets an explicit timeout — I don't rely on a default that might be far
  longer than actually useful."
- "Retries get exponential backoff with jitter, not a fixed delay and not an immediate retry
  loop."
- "I only retry operations I know are safe to retry — for anything else, I need idempotency first
  (§22)."

### 5. Interview-Ready Answer

> "These four ideas work together: a timeout means I fail fast instead of hanging indefinitely, a
> retry gives a transient failure a second chance, exponential backoff spaces retries out so I'm
> not hammering a struggling dependency, and jitter prevents many clients from retrying in
> synchronized waves. I treat this as the default toolkit for any call to something that could be
> slow or briefly unavailable — with the caveat that I only retry operations that are actually
> safe to repeat."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §67 (Retries, Timeouts & Circuit Breakers) chapter
(full implementation patterns).

---
