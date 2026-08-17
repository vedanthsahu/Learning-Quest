## 102. Performance Review Exercises

### 102.1 How to Use These Exercises

Each exercise gives a symptom and a small amount of supporting data (a metric, a snippet, a profile excerpt) — practice forming a hypothesis and naming what you'd check next *before* reading the discussion, exactly matching the Investigation-before-Root-Cause discipline this handbook's Part XII established for every failure-diagnosis chapter.

### 102.2 Exercise 1: p50 Is Fine, p99 Is Terrible

**Symptom**: An endpoint's median (p50) latency is 40ms, well within target, but its p99 latency is 4 seconds. **What would you check first?** A large gap between p50 and a much higher percentile (companion §58.2's percentile discipline) points toward a specific, infrequent condition affecting a small subset of requests, not a uniform, systemic slowness — check whether the slow requests share a common trait (a specific user, a specific large payload size, a specific code path only some requests take) rather than assuming the whole system is generally slow. **Likely finding**: often a specific, rarely-hit branch (a cache miss, an unusually large result set, companion §74.10's cache-hit-versus-miss bimodality) rather than a uniform capacity problem — the fix targets that specific branch, not general scaling.

### 102.3 Exercise 2: Throughput Plateaus Despite Added Instances

**Symptom**: Doubling the number of application instances behind a load balancer produces almost no improvement in overall throughput. **What would you check first?** A shared resource common to every instance — most commonly the database connection pool's aggregate capacity or the database itself (companion §72.2's multi-instance multiplication problem) — since adding instances only helps if the actual bottleneck scales with instance count, and a shared, unscaled dependency doesn't. **Likely finding**: the database's own query-processing capacity, not connection count or application capacity, has become the binding constraint (companion §70.9's exact point that database resources, not connection slots, are often the real ceiling).

### 102.4 Exercise 3: A Profile Shows 60% of Time in `json.dumps`

**Symptom**: A CPU profile (companion §54.2) of a slow endpoint shows the majority of wall-clock time spent inside `json.dumps`, serializing the response. **What would you check first?** The size and structure of the response payload — a very large or deeply nested payload can make serialization itself a genuine bottleneck (companion §56.1), particularly with the standard library's `json` module rather than a faster alternative. **Likely finding**: switching to `orjson` (companion §56.2) for a large, hot-path response, or — more fundamentally — reconsidering whether the endpoint needs to return this much data in a single response at all (pagination, companion §31.2, as a structural rather than purely technical fix).

### 102.5 Exercise 4: Memory Usage Climbs, Then Drops Sharply Every Few Hours

**Symptom**: Process memory (RSS) rises steadily over several hours, then drops sharply back to baseline, in a repeating sawtooth pattern. **What would you check first?** Whether the sharp drops correlate with process restarts (a liveness probe killing and restarting the container once memory crosses a threshold, companion §66.2) — if so, this is a genuine memory leak (companion §75) being *masked* by the restart cycle rather than resolved by it; the sawtooth pattern is not evidence the system is healthy, it's evidence of a leak whose symptom is being suppressed. **Likely finding**: an unbounded cache or accumulating structure (companion §75.6), with the restart cycle providing just enough relief that the leak was never investigated as a genuine bug.

### 102.6 Exercise 5: A Benchmark Shows a 3x Speedup, But Production Shows No Change

**Symptom**: A local, isolated benchmark of an optimized function shows a clear 3x improvement, but the equivalent production endpoint shows no measurable latency improvement after deploying the optimization. **What would you check first?** Whether the optimized function was actually the dominant cost in the *end-to-end* request, or only a small fraction of it (companion §58.5's noise-controlled-benchmarking caveat about benchmarking in isolation versus in situ) — a 3x speedup on a function responsible for 5% of total request time produces, at best, a barely-measurable ~3% overall improvement, easily lost in normal request-latency variance.

### 102.7 Mini Lab

Take a real performance complaint from your own project (or deliberately introduce one of Part XII's named failure modes, §70-77, into a test environment) and practice stating your hypothesis and your next check — in that order, before looking at any data — exactly as this chapter's five exercises modeled; the discipline of committing to a hypothesis before checking data is what separates genuine diagnosis from post-hoc rationalization of whatever the data happens to show.

---
