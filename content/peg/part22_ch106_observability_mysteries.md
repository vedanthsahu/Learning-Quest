## §106. Observability Mysteries

*Format: Symptom → What's Actually Going On → The Fix → What to Say About It.*

### "Production logs don't show enough information to debug."

- **What's actually going on**: Usually a combination of insufficient structured context
  (missing correlation IDs, missing key fields) and log-level discipline that filtered out
  useful detail before it was ever written.
- **The fix**: Adopt structured logging with consistent, meaningful fields, and a correlation ID
  attached automatically to every log line; revisit what's actually captured at each log level.
- **What to say**: "I'd check whether logs are structured with a correlation ID by default,
  since that's usually the gap once an incident makes 'not enough information' obvious."
- **See also**: §47, §48, §49.

### "Test passes locally but fails in CI."

- **What's actually going on**: Environment differences (dependency versions, timezone, locale,
  available resources), test order dependency, or a genuinely flaky/timing-dependent test that
  happens to pass more often locally than in CI's environment.
- **The fix**: Check for environment parity issues first; if the test is timing- or order-
  dependent, fix that dependency rather than accepting the flakiness.
- **What to say**: "I'd look for an environment difference or a hidden test dependency before
  assuming CI itself is somehow broken."
- **See also**: §19, §77.

### "App is slow but CPU is low."

- **What's actually going on**: CPU isn't the bottleneck — the actual constraint is likely I/O
  wait (slow database queries, slow external API calls), lock contention, or the application
  waiting on something else entirely (a connection pool, a downstream service).
- **The fix**: Look at latency breakdown via tracing (§52) rather than CPU metrics; check for
  slow queries, lock waits, and downstream dependency latency specifically.
- **What to say**: "Low CPU with high latency points away from compute and toward I/O wait, lock
  contention, or a slow downstream dependency — I'd trace the request rather than keep looking at
  CPU."
- **See also**: §45, §50, §52.

---
