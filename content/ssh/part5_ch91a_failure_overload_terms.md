# PART V — TERMINOLOGY ENCYCLOPEDIA

## 91.A Failure and Overload Terms

*This encyclopedia is a reference, not a teaching text — every term here was already introduced in context earlier in this handbook. Each entry cross-references its fuller treatment and adds the specific historical, production-story, and misconception detail that a quick-reference format is best suited to hold.*

### Thundering Herd

**Definition**: A large number of processes or threads, all waiting on the same event, are all woken simultaneously when that event occurs, and all immediately contend for the same limited resource, even though only a small fraction of them can actually be served at once.

**History**: The term predates modern distributed systems — it originally described an operating-system-level problem where multiple processes blocked on `accept()` for the same socket were all woken by the kernel when a single connection arrived, even though only one could actually accept it.

**Real example**: A cron job scheduled identically across thousands of servers ("run at exactly midnight") causes every server to hit a shared resource (a config service, a database) at the same instant.

**Failure example**: A cache entry (§39.5) or a widely-shared lock is released, and every one of thousands of waiting requests immediately retries at once, overwhelming whatever they're all contending for.

**Detection**: A sharp, synchronized spike in load on a shared resource that correlates precisely with a single triggering event (a cache expiration, a service recovery) rather than organic traffic growth.

**Mitigation**: Request coalescing/jitter (§39.5), randomized scheduling instead of fixed synchronized times, and exponential backoff with jitter for recovery scenarios (§64.5).

**Misconception**: This is not the same as ordinary high load — the defining feature is *synchronization*; the same total request volume spread randomly over time would cause no problem at all.

### Cache Stampede

**Definition**: A specific instance of the thundering herd where many concurrent requests for the same expired or invalidated cache key all simultaneously fall through to the underlying data store. See §39.5 for full mechanism and mitigation (request coalescing, probabilistic early expiration, stale-while-revalidate).

**Real example / production story**: Widely documented at large social and e-commerce platforms when a single, extremely popular cache key (a celebrity's profile, a flash-sale product page) expires under heavy concurrent load.

**Misconception**: Adding more cache capacity does not fix this — the problem is concurrent *misses* on one key, not insufficient cache size.

### Cache Avalanche

**Definition**: Many *different* cache keys expire at approximately the same time (commonly from a bulk cache-warming operation using identical TTLs), producing a system-wide surge of cache misses rather than one hot key's stampede. See §39.6 for mechanism and the TTL-jitter mitigation.

**Real example**: A nightly batch job that refreshes an entire product catalog's cache entries with one uniform expiration time, producing a predictable, recurring load spike the following day at that exact expiration moment.

**Misconception**: Often confused with a cache stampede — the distinguishing feature is *breadth* (many keys) versus stampede's *depth* (many requests for one key).

### Cache Penetration

**Definition**: Requests target keys that do not exist in the underlying data store at all, meaning the cache can never help — every such request necessarily reaches the backing store on every attempt. See §39.7 for mechanism and the negative-caching mitigation.

**Real example / production story**: An attacker deliberately probing an API with a flood of non-existent record IDs specifically to bypass caching and load the database directly — a documented, real denial-of-service technique distinct from raw volumetric attacks.

**Misconception**: This is not solved by a larger cache — a cache has nothing to hold for a key that legitimately doesn't exist unless the *absence* itself is explicitly cached.

### Retry Storm

**Definition**: A cascading surge of retry attempts, typically triggered when a downstream dependency becomes slow or unavailable and every caller's retry logic fires simultaneously, further overloading the already-struggling dependency and delaying its recovery. See §64.5 and §79.5 for detailed real incident patterns.

**Real example**: Documented across numerous major cloud provider and platform postmortems as a secondary, often longer-lasting outage following an initial, smaller failure.

**Detection**: Sustained, elevated request volume against a dependency that continues well past the point where the dependency's own health has begun recovering.

**Mitigation**: Exponential backoff with jitter, circuit breakers (§42.5) to stop attempting calls to a known-unhealthy dependency, and load shedding during recovery windows.

**Misconception**: Retries are not inherently dangerous — an *un-jittered*, synchronized retry policy is the actual root cause; well-designed backoff with jitter largely eliminates this risk.

### Cascading Failure

**Definition**: A failure in one component propagates to and causes failure in components that depend on it, often because of missing timeouts, missing circuit breakers, or shared, unpartitioned resource pools. See §1.3.3, §11.1, and §42.4-42.5 for full mechanism and mitigation (bulkheads, circuit breakers).

**Real example / production story**: The recurring "non-critical dependency takes down critical services" pattern documented in §64.4, where a service perceived as low-importance turns out to be widely, carelessly depended upon.

**Misconception**: Cascading failure is a property of the *system's coupling*, not of any single component's reliability — a component with excellent uptime can still trigger a cascade if callers don't defend against its rare failures.

### Brownout

**Definition**: A deliberate or incidental partial degradation of service — reduced functionality or quality, rather than a complete outage — often used deliberately as a load-shedding strategy (serving a simplified, cheaper-to-compute version of a response under high load) rather than failing outright.

**Real example**: A retail site disabling personalized recommendations (an expensive computation) during a traffic surge while keeping core checkout functionality fully available.

**Misconception**: A brownout is not always a failure — deliberately engineered brownouts are a legitimate, valuable reliability technique (a form of graceful degradation), distinct from an unplanned, uncontrolled partial outage.

### Gray Failure

**Definition**: A failure mode where a component is technically "up" by simple health checks but is not actually functioning correctly for real traffic — the most dangerous and hardest-to-detect failure category precisely because naive monitoring reports the component as healthy. Directly connects to §9.2's "slow versus dead" ambiguity and §28.5's warning about shallow health checks.

**Real example / production story**: A database replica that responds to a simple ping but has silently stopped replicating new writes — appearing perfectly healthy to a shallow health check while serving increasingly stale data.

**Detection**: Health checks that exercise real, representative functionality (§28.5) rather than mere liveness; monitoring actual success/latency of real traffic rather than synthetic pings alone.

**Misconception**: "The health check is green" is not the same as "the service is working" — this is the single most important distinction this term exists to name.

### Blast Radius

**Definition**: The scope of impact a given failure, compromise, or mistake can have — how much of the overall system is affected when one specific component fails. A unifying concept referenced throughout this handbook (§1.3.3, §17.3, §42.4, §61.4) rather than a single mechanism.

**Real example**: A compromised credential in a zero-trust architecture (§61.4) can only reach the specific, narrowly-scoped resources that credential was explicitly authorized for — a small blast radius by design, contrasted with a castle-and-moat model's much larger blast radius for the same compromise.

**Mitigation**: Bulkheads (§42.4), least-privilege access control (§72.3), multi-account cloud isolation (§68.2), and sharding/cell-based architectures — all, at their core, blast-radius-reduction techniques wearing different names.

**Misconception**: Reducing blast radius is not the same as reducing the probability of failure — it is a deliberate, separate investment in limiting *consequence*, valuable even for failures you cannot prevent outright.

---
