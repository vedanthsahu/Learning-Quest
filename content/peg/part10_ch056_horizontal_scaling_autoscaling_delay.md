## §56. Horizontal Scaling and Autoscaling Delay

### 1. The Vocabulary

- **Horizontal scaling** — adding more instances to handle more load (vs. **vertical scaling** —
  making one instance bigger).
- **Autoscaling** — automatically adding/removing instances based on a metric (CPU, request count,
  queue depth).
- **Autoscaling delay** — the real, non-zero time between "load increased" and "a new instance is
  actually up, warmed, and serving traffic."
- **Warm-up time** — how long a freshly-started instance takes before it's actually performing at
  full capacity (connection pools filling, caches populating, JIT-compiled code warming up).

### 2. Where It Sits, and Why Teams Use It

Horizontal scaling is what makes a service able to handle more than one machine's worth of
traffic at all. Autoscaling automates the "add more instances" decision — but it's not
instantaneous, and that lag is a real, frequently-underestimated design constraint.

### 3. What Actually Breaks

- **Autoscaling reacting too slowly to a sudden traffic spike** — if a spike happens faster than
  new instances can start and warm up, the existing fleet gets overwhelmed *during* the gap, even
  though the autoscaling eventually "worked" a few minutes later.
- **Scaling on the wrong metric** — CPU usage can look fine even while a service is actually
  overwhelmed on a different resource (memory, database connections, downstream API rate limits);
  autoscaling tuned only on CPU won't react to those.
- **New instances immediately overwhelmed on startup** — a freshly-started instance receiving a
  full share of traffic before caches are warm or connections are established can perform worse
  than the already-loaded existing fleet for its first few moments.
- **Scale-in removing an instance mid-request** — an aggressive scale-down policy can terminate an
  instance that's still actively serving requests if it isn't coordinated with connection draining
  (§9).

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Autoscaling has real lag — I plan for the gap between load increasing and new capacity actually
  being ready, not assume it's instantaneous."
- "I pick scaling metrics that actually reflect the real bottleneck, not just CPU by default."
- "I coordinate scale-in with connection draining so instances aren't terminated mid-request."

### 5. Interview-Ready Answer

> "Autoscaling isn't instantaneous — there's real delay between load increasing and a new,
> warmed-up instance actually serving traffic, and a fast enough spike can overwhelm the existing
> fleet during exactly that gap. I plan for that lag with some baseline headroom rather than
> scaling purely reactively from zero slack, and I make sure the scaling metric actually reflects
> the real bottleneck — CPU is a common default, but it's not always what's actually constrained."

### 6. Go Deeper

companion Software Systems Handbook's §51 (Scalability Patterns Deep Dive) chapter; companion
Cloud Engineering Playbook's §23 (Auto Scaling) chapter and companion Cloud Engineering Playbook's
§51 (Why Did My Auto Scaling Group Not Scale (or Scale Too Late)?) chapter.

---
