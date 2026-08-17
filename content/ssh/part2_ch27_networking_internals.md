## 27. Networking Internals: TCP, HTTP Evolution, TLS, and DNS Resolution

### 27.1 What This Chapter Adds to §3

§3 walked through the journey of a request at the mental-model level. This chapter opens up the actual mechanisms behind the hops that matter most for engineering judgment: how TCP delivers a reliable stream over an unreliable network, how HTTP has evolved to address specific performance limitations, how TLS establishes trust, and how DNS resolution actually works.

### 27.2 TCP: The Three-Way Handshake and Reliable Delivery

**TCP** provides the illusion of a reliable, ordered byte stream over a network that only actually promises to deliver individual, unordered, sometimes-lost packets. Before any data flows, TCP establishes a connection via a **three-way handshake**:

```
Client                          Server
  |------ SYN (seq=x) --------->|      "I want to connect, my sequence starts at x"
  |<--- SYN-ACK (seq=y,ack=x+1)-|      "OK, I acknowledge x; my sequence starts at y"
  |------ ACK (ack=y+1) ------->|      "Acknowledged; connection established"
```

Every byte sent afterward is numbered (sequence numbers) and acknowledged by the receiver; unacknowledged bytes are retransmitted after a timeout, and out-of-order packets are buffered and reassembled in the correct order before being handed to the application. This is the direct mechanism behind §3.2's claim that a network call is not a function call: even with TCP's guarantees, the handshake itself costs at least one full round trip before any actual data can be sent — a fixed latency tax paid on every new connection, which is precisely why connection reuse (persistent connections, connection pooling) is such a significant performance lever.

### 27.3 Congestion Control: Why TCP Throughput Ramps Up, Then Backs Off

TCP does not send data as fast as possible from the first packet — it uses **congestion control** to discover how much the network path can actually sustain without overwhelming it. The classic mechanism, **slow start**, begins with a small congestion window (how much unacknowledged data may be in flight) and roughly doubles it with each successful round trip, until either a target is reached or a packet loss is detected — loss being interpreted as a sign of congestion, at which point the window is sharply reduced and grows more cautiously afterward. The practical consequence: a new TCP connection is slower per-byte than an established one, because it hasn't yet "ramped up" — another concrete reason why reusing connections outperforms opening new ones per request, beyond just avoiding the handshake cost in §27.2.

### 27.4 HTTP's Evolution: Each Version Solving the Previous One's Specific Bottleneck

Consistent with this handbook's philosophy (§0.1), HTTP's version history is best understood as a sequence of responses to specific, identified bottlenecks, not arbitrary feature additions:

- **HTTP/1.1** introduced persistent connections (reusing one TCP connection for multiple requests, avoiding §27.2's handshake cost per request) and pipelining — but responses still had to return in the order requests were sent, so one slow response blocked every response queued behind it on that connection (**head-of-line blocking**, Part V §91.B).
- **HTTP/2** solved application-level head-of-line blocking by multiplexing many requests and responses over a single TCP connection simultaneously, each broken into independently-interleaved frames — a slow response no longer blocks unrelated ones on the same connection. It did not, however, solve head-of-line blocking at the TCP layer itself: because all of HTTP/2's streams still ride over one TCP connection, a single lost packet anywhere stalls *all* of that connection's streams until TCP's own in-order delivery guarantee (§27.2) can be satisfied.
- **HTTP/3** addresses that remaining TCP-layer limitation by moving off TCP entirely, running instead over **QUIC**, a transport built on UDP that implements its own reliability and multiplexing such that a lost packet only stalls the individual stream it belonged to, not every stream sharing the connection. QUIC also folds the transport and TLS handshakes together, reducing the round trips needed to establish a new secure connection compared to TCP+TLS layered separately.

The pattern to internalize: each version exists because a real, specific, measured limitation of the previous one mattered at scale — not because a bigger number is inherently better.

### 27.5 The TLS Handshake: Establishing Trust and a Shared Secret

TLS solves two distinct problems simultaneously: verifying that you're actually talking to who you think you are (via certificates, ultimately anchored in a trusted certificate authority), and establishing a shared encryption key over a connection that started with no shared secret at all, without ever transmitting that key in a form an eavesdropper could use. Modern TLS (1.3) accomplishes this in one round trip using asymmetric cryptography for the initial key exchange (each side can compute the same shared secret from public information plus their own private key, without ever transmitting the secret itself), then switches to much faster symmetric encryption for the actual data using that shared secret. The engineering-relevant fact: this handshake is additional round-trip latency stacked on top of TCP's own handshake (§27.2), which is why **TLS session resumption** (reusing a previously-negotiated secret for a new connection to the same server) and QUIC's combined handshake (§27.4) both exist specifically to avoid paying this cost repeatedly.

### 27.6 DNS Resolution: A Distributed, Cached Lookup, Not a Single Call

Resolving a domain name to an IP address is not one request to one authoritative server — it is a hierarchical lookup, typically satisfied at the fastest possible layer thanks to aggressive caching: a resolver first checks its own cache, then a recursive resolver (often provided by the OS or ISP), which itself checks its cache before, if necessary, querying a root server, then a top-level-domain server, then the domain's own authoritative server, caching every answer along the way according to a **TTL (time-to-live)** the domain owner sets. This caching is precisely why DNS changes (e.g., pointing a domain to a new server during a migration) do not take effect everywhere instantly — resolvers around the world may be holding a cached answer until its TTL expires, a direct, practical consequence engineers must plan around during any infrastructure migration that changes an IP address.

### 27.7 Common Mistakes and Production Debugging Signals

- Opening a new TCP (and TLS) connection per request instead of reusing connections, paying §27.2's and §27.5's handshake costs repeatedly — a common, easily-fixed source of unnecessary latency.
- Setting DNS TTLs too high before a planned migration, causing some fraction of traffic to keep resolving to the old, decommissioned address long after cutover, per §27.6.
- Misattributing HTTP/2 or HTTP/3 multiplexing as "solving all head-of-line blocking" without understanding that HTTP/2 still suffers it at the TCP layer (§27.4) — relevant when diagnosing why an HTTP/2 connection still stalls entirely under packet loss.

### 27.8 Engineering Intuition

> **How do I know a networking-internals issue is at play, rather than the application?** Latency that scales with round-trip count (new connections, repeated handshakes) rather than with payload size or application logic time points here specifically.
>
> **What metrics indicate it?** TCP retransmit rate and connection establishment time; TLS handshake duration as a distinct trace segment; DNS resolution time isolated from the rest of a request's latency.
>
> **What breaks first if these mechanisms are ignored?** Unnecessary per-request latency from repeated handshakes; migration incidents caused by unaccounted-for DNS caching (§27.6); confusing performance regressions under packet loss that only make sense once TCP-layer head-of-line blocking (§27.4) is understood.
>
> **When do you not need this depth?** Standard use of a well-configured HTTP client library and reverse proxy handles connection reuse, TLS session resumption, and protocol version selection automatically for the overwhelming majority of applications.
>
> **What would a hyperscale company do?** Actively choose and tune transport protocols (adopting HTTP/3/QUIC deliberately for latency-sensitive, high-packet-loss environments like mobile networks), tune TCP congestion control algorithms, and plan DNS TTL strategy explicitly around migration and failover needs (§59).
>
> **What would a two-person startup do?** Rely on their CDN/load balancer's default protocol and TLS configuration entirely, and only think about DNS TTLs when performing an infrequent infrastructure migration.
>
> **What changes with scale?** At low request volume, connection-setup overhead is a rounding error. At high request volume or with a geographically distributed, high-latency user base (mobile networks, satellite links), these protocol-level details directly determine a meaningful fraction of perceived performance, and become deliberate optimization targets (§59, §73).

### 27.9 Exercises

1. Explain, using §27.2 and §27.3, why a load balancer or client that opens a fresh TCP connection per request performs measurably worse than one that reuses connections, even before any TLS is considered.
2. A team observes that after an HTTP/2 migration, performance under lossy mobile network conditions did not improve as much as expected. Using §27.4, explain what limitation this points to and what protocol change would address it directly.

### 27.10 Further Reading

- Kurose & Ross, *Computer Networking: A Top-Down Approach* — full mechanism-level treatment of TCP and congestion control.
- Daniel Stenberg, "HTTP/3 Explained" (free online book by the curl author) — an accessible, detailed treatment of QUIC and HTTP/3's design motivations, directly extending §27.4.

---
