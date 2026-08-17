## 50. Why Is My RDS/Aurora Connection Pool Exhausted?

*(Prerequisite: companion §11 RDS, §12 Aurora, §2 Lambda)*

### 50.1 Symptoms
Applications receive connection-timeout or "too many connections" errors from the database, often correlated with a traffic spike, a Lambda concurrency increase, or a new service being deployed that connects to the same database.

### 50.2 Possible Causes
A genuine mismatch between the database instance's maximum connection limit (a function of instance size) and actual concurrent connection demand; a Lambda function connecting directly to the database without RDS Proxy, where each concurrent invocation opens its own connection (companion §2's exact named risk); a connection leak in application code (a connection acquired but never released, even on an error path); multiple application instances/services each maintaining their own pool, with the sum exceeding the database's actual capacity.

### 50.3 Metrics
`DatabaseConnections` approaching `max_connections` (a function of instance class); for Lambda specifically, `ConcurrentExecutions` for the connecting function, since each concurrent invocation without pooling is a potential separate connection.

### 50.4 Logs
Application logs showing connection-timeout errors correlated with deploy events or traffic spikes; database-side logs (if enabled) showing connection counts and, ideally, which application/source is opening them.

### 50.5 Investigation
Check whether Lambda functions are connecting directly to the database (a clear, common root cause) versus through RDS Proxy. Check whether connection count tracks traffic level directly (recovering during low-traffic periods, suggesting genuine undersizing) or trends upward regardless of traffic (suggesting a leak) — the same diagnostic split companion Python Backend Handbook §72.11's decision tree uses generally, applied here at the AWS-managed-database layer specifically.

### 50.6 Root Cause
In practice, the single most common AWS-specific instance of this failure is a Lambda function connecting directly to RDS/Aurora without RDS Proxy — under a burst of concurrent invocations, each opening its own connection, the database's connection limit is exhausted in seconds, a failure mode with no real analog for a traditional, fixed-size EC2/container fleet.

### 50.7 Fix
Introduce RDS Proxy between Lambda and the database, pooling and reusing connections across concurrent invocations rather than one-per-invocation. For a genuine leak in non-Lambda application code, audit every connection-acquisition path for guaranteed release (companion Python Backend Handbook §72.5's exact discipline). For genuine undersizing across a fixed fleet, resize the instance class or reduce per-instance pool size to fit the database's actual capacity.

### 50.8 Tradeoffs
RDS Proxy adds a small latency overhead and its own hourly cost, but is close to mandatory for any Lambda-to-relational-database architecture at real concurrency — the alternative (accepting connection exhaustion under load) isn't a viable tradeoff to make instead.

### 50.9 Prevention
Never connect a Lambda function directly to RDS/Aurora in a production design without RDS Proxy in between. Monitor `DatabaseConnections` as a leading indicator with alerting well before the hard connection-limit failure. Size the database instance against measured, not guessed, concurrent connection demand.

### 50.10 Decision Tree
```
Is the connecting workload Lambda-based?
  YES, no RDS Proxy in front -> This is very likely the root cause. Add RDS Proxy.
  YES, RDS Proxy already in place -> Check Proxy's own connection pool sizing.
  NO (fixed EC2/container fleet) -> Does connection count track traffic (recovering
     during lulls) or trend upward regardless of load?
       TRACKS TRAFFIC -> Genuine undersizing; resize instance or reduce pool size.
       TRENDS UPWARD REGARDLESS -> Likely a connection leak; audit acquisition paths.
```

---
