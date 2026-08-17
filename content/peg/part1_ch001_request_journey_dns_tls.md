## §1. The Journey of a Request: DNS, TLS, and What Happens When You Hit Enter

### 1. The Vocabulary

- **Domain** — the human-readable name (`example.com`) registered with a registrar.
- **DNS (Domain Name System)** — the lookup system that turns a domain into an IP address.
- **Resolver** — the service (often your ISP's or a public one like 8.8.8.8) that answers "what's
  the IP for this domain?" on your behalf.
- **Nameserver (NS)** — the authoritative server that actually knows a domain's records.
- **Hosted zone** — the container of DNS records for a domain, managed by a DNS provider (e.g.
  Route 53, Cloudflare).
- **TTL (Time To Live)** — how long a DNS answer is allowed to be cached before it must be
  re-checked.
- **Registrar** — where you *bought* the domain (GoDaddy, Namecheap, Route 53 Domains) — not the
  same thing as where its DNS records live.

### 2. Where It Sits, and Why Teams Use It

Every single web request starts here, invisibly: the browser needs an IP address before it can
send anything. DNS is the internet's phone book, and it's cached aggressively at every layer
(browser, OS, ISP resolver, downstream resolvers) specifically so that phone-book lookups aren't
happening on every request — which is exactly the design choice that causes the confusion below.

### 3. What Actually Breaks

- **You change a DNS record and don't see the change for hours.** This is not a bug — it's the
  TTL doing exactly what it's supposed to do. A record with a 24-hour TTL can take up to 24 hours
  to fully propagate everywhere, because every resolver that already cached the old answer will
  keep serving it until its cached copy expires. Lower the TTL *before* a planned change if you
  need fast cutover.
- **Changing a record vs. changing nameservers are wildly different in speed and blast radius.**
  Updating a single A record inside your existing hosted zone only affects that record, bounded
  by its TTL. Changing *nameservers* at the registrar (pointing the whole domain at a different
  DNS provider) can take much longer to propagate globally and affects every record under that
  domain at once.
- **"It works on my machine" for DNS** — your machine or browser cached the old answer; someone
  else's resolver already refreshed. Flushing local DNS cache is a real, common debugging step.
- **A missing or wrong CNAME/A record** silently breaks a subdomain with no error message beyond
  "this site can't be reached" — there's nothing to time out, DNS just returns nothing useful.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "TTL controls how long a DNS change takes to be visible everywhere — it's not instant."
- "The registrar is where you own the domain; the DNS provider/hosted zone is where the records
  actually live — they're often the same company, but don't have to be."
- "A, AAAA, CNAME, MX, TXT, and NS records each serve a different purpose, and I can say what
  each one is for."
- "Before a DNS cutover, I'd lower the TTL in advance so the change propagates fast when it
  actually happens."

### 5. Interview-Ready Answer

> "When I hit enter on a URL, the browser first needs an IP address, so it asks a DNS resolver,
> which walks up to the domain's authoritative nameservers if it doesn't already have a cached
> answer. That answer is cached for as long as its TTL says, which is exactly why DNS changes
> don't show up everywhere instantly — anyone with a still-valid cached answer keeps using the
> old one until it expires. Once we have an IP, the browser opens a TCP connection, does a TLS
> handshake if it's HTTPS, and only then sends the actual HTTP request."

### 6. Go Deeper

companion Software Systems Handbook's §3 (Mental Model: Networking) for the big-picture framing,
and companion Software Systems Handbook's §27 (Networking Internals: TCP, HTTP/1.1->2->3, TLS,
DNS) for the full TCP/TLS handshake mechanics and DNS resolution algorithm. companion Cloud
Engineering Playbook's §7 (Route 53) and companion Cloud Engineering Playbook's §8 (CloudFront)
cover DNS and CDN configuration in AWS specifically.

---
