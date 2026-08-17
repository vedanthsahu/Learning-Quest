## §7. Load Balancers: Why, L4 vs L7, and Common Algorithms

### 1. The Vocabulary

- **Load balancer** — distributes incoming traffic across multiple backend instances.
- **Layer 4 (L4)** — balances based on IP/port only, no visibility into HTTP content; fast, but
  dumb about the request itself.
- **Layer 7 (L7)** — balances based on the actual HTTP request (path, headers, host), enabling
  routing decisions.
- **Round robin / weighted round robin** — send requests to backends in rotation, optionally
  favoring some over others.
- **Least connections / least response time** — send the next request to whichever backend is
  currently least busy or fastest.
- **IP hash** — always route the same client IP to the same backend (a crude form of stickiness).

### 2. Where It Sits, and Why Teams Use It

One server is a single point of failure and a hard capacity ceiling. A load balancer sits in
front of a fleet, spreading traffic and hiding individual instance failures from the client — the
foundation every horizontally-scaled system is built on.

### 3. What Actually Breaks

- **Choosing L4 when you needed L7 routing** — if you need to route `/api/*` to one service and
  `/admin/*` to another, that's inherently an L7 decision; an L4 balancer can't see the path at
  all.
- **Uneven load with round robin** — if requests vary wildly in cost, plain round robin can leave
  one backend overloaded while another sits idle; least-connections handles this better.
- **A "fixed" backend that's actually still receiving traffic** — load balancers often keep
  sending a trickle of traffic to an instance mid-deregistration (connection draining) — a
  restarted instance can look "fixed" while it's still finishing old requests.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "L4 balances on IP/port without looking at the request; L7 can route based on path, host, or
  headers — AWS's NLB vs ALB is the concrete example of this split."
- "Round robin is the simple default; least-connections is what I'd reach for if requests have
  very different costs."
- "A load balancer only sends traffic to instances that pass its health check — that's the whole
  mechanism behind 'take an unhealthy instance out of rotation.'"

### 5. Interview-Ready Answer

> "A load balancer exists because one server is both a scaling ceiling and a single point of
> failure. L4 balancers work at the connection level and don't see HTTP content, so they're fast
> but can only route on IP/port; L7 balancers understand the request and can route by path or
> host, which is what you need for things like path-based microservice routing. For algorithms, I
> default to round robin unless request cost varies a lot, in which case least-connections is the
> better fit."

### 6. Go Deeper

companion Cloud Engineering Playbook's §10 (Application Load Balancer) chapter (ALB vs NLB in AWS
specifically); companion Software Systems Handbook's §28 (Load Balancing Algorithms & Reverse
Proxies) chapter.

---
