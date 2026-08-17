## 18. Mental Model: Performance and Scalability

### 18.1 Two Different Questions, Again

As with AuthN/AuthZ in §5, two words used almost interchangeably in casual conversation actually answer different questions. **Performance** asks: how quickly does the system respond to one request? **Scalability** asks: how does the system's performance and capacity change as load (users, requests, data) grows? A system can be fast for one user and fail entirely under load from a thousand (a scalability problem, not a performance problem), or it can hold up fine under enormous load while still being unpleasantly slow for any single request (a performance problem, not a scalability problem). Profiling methodology, latency percentiles, and benchmarking are deferred to Pass 2, §50–51.

### 18.2 Latency vs. Throughput: The Two Numbers Performance Actually Means

"Performance" itself splits into two distinct measurements that can move independently of each other. **Latency** is how long one operation takes, from request to response. **Throughput** is how many operations the system can complete per unit of time, in aggregate. Critically, improving one does not automatically improve the other — a system can process a huge number of requests per second in aggregate (high throughput) while each individual request still takes a noticeably long time to complete (high latency), if enough requests are processed concurrently. Conversely, a system tuned purely to minimize the latency of one request in isolation may not be architected to sustain many such requests simultaneously. Knowing which one actually matters for a given use case — a real-time interactive request cares about latency; a nightly batch job cares about throughput — determines which techniques in this book are even relevant.

### 18.3 Why "Just Make It Faster" Is Not an Engineering Answer

Per the discipline established in §1.5, "make it faster" is not itself an actionable target — it must be translated into a specific, measured bottleneck (§1.4: is this compute-bound, storage-I/O-bound, or network-bound?) before any technique can be meaningfully applied. Adding more servers does nothing for a single request that is slow because of an unindexed database query (§6.3) — that is a latency problem rooted in one specific hop, not a capacity problem solvable by horizontal scaling. Conversely, adding a faster CPU does nothing for a system that is falling over because it can't accept enough concurrent connections — that is a scalability problem rooted in architecture, not raw compute speed. Diagnosing *which* problem you actually have, using the observability tools from §16, always precedes choosing a fix.

### 18.4 Vertical vs. Horizontal Scaling

Once a genuine capacity limit is identified, there are exactly two directions to address it. **Vertical scaling** means making the existing machine bigger — more CPU, more memory, faster disks. It is simple (nothing about the application's architecture needs to change) but has a hard ceiling (there is always a biggest machine available) and does nothing for the failure-pressure concern from §1.1 (a single, larger machine is still a single point of failure). **Horizontal scaling** means adding more machines and spreading load across them. It has no inherent ceiling and directly improves fault tolerance (losing one of many machines is a partial, survivable event), but it requires the application to be architected so that work actually *can* be spread across independent machines — which is far from automatic, and is the direct motivation for the "stateless application tier" pattern developed in §51.

### 18.5 Why Statelessness Is the Hinge That Horizontal Scaling Depends On

A server that stores something in its own local memory between requests from the same user (a **stateful** server) cannot simply have its requests spread arbitrarily across a pool of identical machines, because the next request from that user needs to reach the *specific* machine holding its state, or the state needs to be replicated everywhere — reintroducing the exact replication tradeoffs from §8.3. A **stateless** server keeps no such local memory, storing all durable state in a shared database or cache instead, which means literally any machine in the pool can serve any request equally well. This is why horizontal scaling and statelessness are so often discussed together: statelessness is what makes the "spread load across many identical, interchangeable machines" idea actually work smoothly, and designing for it from the start is far cheaper than retrofitting it onto a system that has grown to depend on local, per-server memory.

### 18.6 Engineering Intuition

> **How do I know whether I have a latency problem or a scalability problem?** Test one request in isolation, with no concurrent load. If it's still slow, that's latency (§18.2) — look at the specific operation's bottleneck (§18.3). If it's fast alone but the system degrades under many concurrent requests, that's scalability.
>
> **What symptoms indicate a scalability problem specifically?** Performance that is fine in testing or at low traffic and degrades — often sharply, not gradually — past a specific concurrent-load threshold.
>
> **What metrics indicate it?** Latency percentiles (especially p95/p99, not just the average) plotted against concurrent request count or requests-per-second, looking for the point where the curve bends sharply upward.
>
> **What breaks first if scalability isn't planned for?** A stateful architecture that cannot be horizontally scaled without a costly redesign, forcing the system into vertical scaling's hard ceiling (§18.4) exactly when growth is accelerating and the ceiling matters most.
>
> **When should you *not* invest in horizontal scalability yet?** When a single, reasonably-sized machine comfortably serves current and near-future expected load — vertical scaling and a simple architecture are strictly cheaper until that ceiling is genuinely in sight (§81–83 in Part IV).
>
> **What would a hyperscale company do?** Design every service to be stateless and horizontally scalable by default, treating any accidental server-local state as a bug to be fixed, because at their scale vertical scaling's ceiling is reached almost immediately and horizontal scaling is the only viable path.
>
> **What would a two-person startup do?** Run a single, modestly-sized server (or a small vertically-scaled one) and not worry about statelessness or horizontal scaling until a specific, measured load threshold makes it necessary.
>
> **What changes with scale?** At low traffic, vertical scaling and even some server-local state are perfectly fine. As concurrent load grows, the system needs to become stateless to scale horizontally at all, a transition Part IV places explicitly around §84, and by very large scale, horizontal scaling across many machines (and eventually many regions, §87) is the only option — vertical scaling's ceiling has long since been reached.

### 18.7 Exercises

1. For a service you know, measure (or estimate) its latency for a single request under no concurrent load, and separately estimate its maximum sustained throughput. Are these numbers currently limited by the same bottleneck, or different ones?
2. Identify one piece of server-local state (session data held in server memory, an in-process cache with no shared backing store) in a system you know, and explain what would break if requests from the same user were suddenly spread across multiple identical servers.

### 18.8 Further Reading

- Neil Gunther, "Guerrilla Capacity Planning" — an accessible practitioner treatment of the latency/throughput distinction and its implications for capacity, previewing §56.
- Google, *Site Reliability Engineering*, Chapter 21 ("Handling Overload") — grounds §18.3's bottleneck-diagnosis discipline in real production scenarios.

---
