## §101. Networking & Deployment Mysteries

*Format: Symptom → What's Actually Going On → The Fix → What to Say About It.*

### "I changed DNS but users still see the old site."

- **What's actually going on**: DNS answers are cached at every layer (browser, OS, ISP
  resolver) for as long as the record's TTL says. The old answer is still valid from every
  cache's perspective until it expires.
- **The fix**: Wait out the TTL, or — better — lower the TTL well before a planned cutover so the
  eventual change propagates fast.
- **What to say**: "This is expected TTL behavior, not a broken change — I'd check what TTL was
  set and whether it was lowered ahead of time."
- **See also**: §1.

### "Browser says CORS error."

- **What's actually going on**: The server's response didn't include a matching
  `Access-Control-Allow-Origin` header for the requesting origin. This is a server-side
  configuration gap, not something fixable from the frontend.
- **The fix**: Configure the server to return the correct CORS headers for the origins that need
  access.
- **What to say**: "CORS is enforced by the browser based on the server's response headers — the
  fix is always server-side."
- **See also**: §3.

### "API works locally but fails after deployment."

- **What's actually going on**: Almost always one of: different dependency versions, missing
  environment variables/secrets, a network/firewall difference, or a case-sensitivity difference
  between filesystems.
- **The fix**: Check those four in order before assuming it's a genuine, environment-specific
  code bug.
- **What to say**: "I'd compare dependency versions, environment variables, and network
  reachability between the two environments before digging into application logic."
- **See also**: §19.

### "Environment variable changed but app still uses old value."

- **What's actually going on**: Most processes only read environment variables once, at startup.
- **The fix**: Restart or redeploy the process after changing the variable.
- **What to say**: "Env var changes usually need a restart — the process isn't watching for
  changes live."
- **See also**: §11.

### "SSL certificate expired or doesn't match the domain."

- **What's actually going on**: Certificate expiry dates are easy to lose track of without
  automated renewal and alerting; a mismatch usually means the cert's SAN (Subject Alternative
  Name) doesn't cover the domain actually being accessed.
- **The fix**: Automate certificate renewal (e.g. via ACM or Let's Encrypt with auto-renewal), and
  alert well ahead of expiry, not on the day of.
- **What to say**: "I'd want certificate renewal automated with alerting ahead of expiry, not a
  manual process someone has to remember."
- **See also**: §1.

### "API returns 502 or 504."

- **What's actually going on**: 502 (Bad Gateway) usually means the upstream server returned an
  invalid response or crashed; 504 (Gateway Timeout) means the upstream didn't respond in time —
  both point at the backend/application server, not the load balancer/proxy reporting them.
- **The fix**: Check the actual application server's health and logs, not just the load
  balancer's.
- **What to say**: "502/504 point at the upstream server specifically — I'd check its health and
  logs before looking anywhere else."
- **See also**: §7, §54.

### "Docker container exits immediately."

- **What's actually going on**: Either the container's main process crashed on startup (check
  logs before the exit), or the container was never meant to be long-running (a one-off job) and
  a restart policy is incorrectly relaunching it.
- **The fix**: Check exit code and pre-crash logs; verify the restart policy matches the
  container's intended lifetime.
- **What to say**: "I'd check whether this container is supposed to be long-running at all before
  assuming the exit itself is the bug."
- **See also**: §17, §20.

### "Deployment succeeded but health check failed."

- **What's actually going on**: The new instance started (deployment succeeded) but isn't
  actually able to serve traffic yet — a dependency isn't reachable, startup isn't complete, or
  the health check itself checks something too strict/too shallow.
- **The fix**: Check what the health check actually verifies, and whether the new instance's
  dependencies (database, config, secrets) are genuinely available.
- **What to say**: "Deployment success and health-check success are different signals — I'd
  check what the health check specifically verifies."
- **See also**: §9, §20.

---
