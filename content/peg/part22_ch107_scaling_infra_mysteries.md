## §107. Scaling & Infra Mysteries

*Format: Symptom → What's Actually Going On → The Fix → What to Say About It.*

### "Autoscaling happened too late."

- **What's actually going on**: Real, non-zero delay between load increasing and a new, warmed-up
  instance actually serving traffic — a fast enough spike can overwhelm the existing fleet during
  that gap.
- **The fix**: Keep some baseline headroom rather than scaling purely reactively from zero slack;
  tune scaling metrics and thresholds to react earlier.
- **What to say**: "Autoscaling has real lag — I'd check whether there's enough baseline headroom
  to absorb a spike during that gap."
- **See also**: §56.

### "Read replica returned stale data."

- **What's actually going on**: Replication lag — an inherent, asynchronous delay between the
  primary and its replicas — widened enough (often under write load) for a read immediately after
  a write to miss it.
- **The fix**: Route anything that needs to see its own very recent write back to the primary,
  not a replica.
- **What to say**: "Read replicas are eventually consistent by design — I'd route read-your-own-
  write scenarios to the primary instead."
- **See also**: §34.

### "Cache recovery overloaded the database."

- **What's actually going on**: A cache stampede — the cache was cleared or expired broadly, and
  many concurrent requests missed at once, all hitting the database simultaneously to
  regenerate the same data.
- **The fix**: Jitter TTLs so keys don't all expire at once, and use request coalescing so only
  one request regenerates a given value while others wait for that result.
- **What to say**: "This is a classic stampede — I'd add TTL jitter and request coalescing to
  prevent many concurrent misses from all hitting the database at once."
- **See also**: §39.

### "Memory usage grows slowly over time."

- **What's actually going on**: A memory leak — objects, connections, or cached data
  accumulating without being released — or an unbounded in-process cache growing indefinitely.
- **The fix**: Profile memory usage over time to find what's accumulating; add eviction/limits to
  any in-process cache.
- **What to say**: "Slow, steady growth points at a leak or an unbounded cache rather than a
  sudden spike — I'd profile to find what's actually accumulating."
- **See also**: §16, §41.

### "Workers are stuck but not crashed."

- **What's actually going on**: A worker waiting indefinitely on a dependency with no timeout —
  it's technically alive (not crashed, so a simple restart-on-crash policy doesn't help) but not
  making progress.
- **The fix**: Add explicit timeouts to every external call a worker makes, so it can't wait
  forever on an unresponsive dependency.
- **What to say**: "Alive-but-stuck usually means a call with no timeout — I'd add one rather
  than rely on crash-based restart policies."
- **See also**: §54.

### "Lambda cold starts caused latency spikes."

- **What's actually going on**: A new (or long-idle) execution environment has to initialize
  before handling its first invocation, adding real, user-visible latency for that request
  specifically.
- **The fix**: Use Provisioned Concurrency to keep environments warm for latency-sensitive
  functions, or reconsider whether Lambda is the right compute choice for this specific workload.
- **What to say**: "Cold starts are a real, known Lambda characteristic, not a bug — Provisioned
  Concurrency is the standard mitigation for latency-sensitive cases."
- **See also**: §68.

### "Cloud bill suddenly increased."

- **What's actually going on**: Often the same root cause as a correctness bug — a retry loop, a
  missing cache causing repeated expensive calls, an autoscaling misconfiguration, or a forgotten
  running resource.
- **The fix**: Check recent changes and cost breakdown by tag/service first; treat the spike as a
  debugging signal, not just a finance line item.
- **What to say**: "A cost spike is often the same root cause as a correctness bug — I'd
  investigate it the same way I would a functional issue, not just flag it to finance."
- **See also**: §70.

### "CloudFront is serving stale content."

- **What's actually going on**: The CDN cached a response (including, sometimes, an error
  response) for longer than expected, or an invalidation wasn't actually issued/completed for the
  changed content.
- **The fix**: Check Cache-Control headers and TTL settings on the origin response, and confirm
  invalidations are actually being triggered on deploy for content that needs it.
- **What to say**: "I'd check both the origin's Cache-Control headers and whether an invalidation
  actually ran, since a CDN can hold content longer than a single setting might suggest."
- **See also**: §4.

### "SQS messages keep reappearing."

- **What's actually going on**: The visibility timeout is shorter than actual processing time, so
  the message becomes visible again and gets picked up by a second consumer while the first is
  still legitimately working on it.
- **The fix**: Increase the visibility timeout to comfortably exceed real processing time, or
  extend it dynamically for long-running jobs.
- **What to say**: "This is almost always a visibility timeout shorter than actual processing
  time — I'd check that first before assuming it's a consumer bug."
- **See also**: §43.

---
