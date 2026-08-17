## §5. Modern Protocols: HTTP/2, HTTP/3, WebSockets, and Reverse Proxies

### 1. The Vocabulary

- **HTTP/1.1** — one request per connection at a time (pipelining exists but is barely used);
  **HTTP/2** — multiplexes many requests over a single TCP connection; **HTTP/3** — like HTTP/2
  but built on UDP (QUIC) instead of TCP, avoiding TCP head-of-line blocking.
- **Keep-alive** — reusing a connection for multiple requests instead of opening a new one each
  time.
- **Compression (gzip, brotli)** — the server compresses the response body; the browser
  decompresses it, trading CPU for bandwidth.
- **WebSocket** — a persistent, full-duplex connection for real-time bidirectional messages.
- **Server-Sent Events (SSE)** — a one-way (server-to-client) persistent stream over plain HTTP.
- **Polling** — the client just asks "anything new?" repeatedly on a timer; the low-tech fallback.
- **Reverse proxy** — a server (nginx, Envoy, HAProxy) sitting in front of your app, terminating
  TLS, compressing responses, and forwarding requests inward.

### 2. Where It Sits, and Why Teams Use It

Most of this is invisible until you need real-time behavior (chat, live dashboards, notifications)
or you're diagnosing why a page feels slow despite a fast backend. Picking the wrong one of
WebSocket/SSE/polling for a feature is a common, avoidable design mistake.

### 3. What Actually Breaks

- **Using a WebSocket when SSE would do** — if data only ever flows server→client, a WebSocket
  adds real complexity (connection state, reconnect logic, load-balancer stickiness) for no
  benefit over the simpler SSE.
- **Polling too aggressively** — a client polling every second "to feel real-time" can generate
  more load than an actual WebSocket connection would, and still feels laggy.
- **Load balancers not configured for sticky/long-lived connections** — WebSockets need the same
  backend instance for the life of the connection; a load balancer that round-robins every
  request will break them.
- **Assuming HTTP/2 or 3 is automatic** — both require explicit server/CDN support and, in some
  environments (older corporate proxies), fall back silently to HTTP/1.1.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "If data only flows one way, server to client, I'd reach for SSE before a WebSocket — it's
  simpler and works over plain HTTP."
- "WebSockets need sticky sessions at the load balancer, or a shared state layer, because the
  connection has to stay pinned to one backend instance."
- "A reverse proxy usually terminates TLS and handles compression before the request ever reaches
  my application code."

### 5. Interview-Ready Answer

> "For real-time features I pick based on directionality first: pure server-to-client updates get
> Server-Sent Events, bidirectional needs get WebSockets, and if neither is available or the
> update frequency is low, polling is a perfectly reasonable fallback. Whichever I pick, if it's a
> persistent connection, I have to make sure the load balancer keeps it pinned to one backend
> instance rather than treating every message as a fresh, freely-routable request."

### 6. Go Deeper

companion Software Systems Handbook's §27 (Networking Internals: TCP, HTTP/1.1->2->3, TLS, DNS)
chapter (TCP/TLS/HTTP version details) and companion Software Systems Handbook's §28 (Load
Balancing Algorithms & Reverse Proxies) chapter (sticky sessions).

---
