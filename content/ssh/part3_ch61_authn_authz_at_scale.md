## 61. AuthN/AuthZ at Scale: Global Identity Systems, Token Revocation at Scale, Zero-Trust Architectures

### 61.1 What This Chapter Adds to §30

§30 covered session/token mechanics and RBAC/ABAC/ReBAC at the level of a single system. This chapter covers what changes once identity must be managed globally, across many services and regions, at massive scale — and develops the zero-trust architecture previewed at the mental-model level in §5.5 and §17.3.

### 61.2 Global Identity Systems: One Identity, Many Services and Regions

At hyperscale, a single user's identity must be recognized consistently across potentially thousands of internal services, spread across multiple regions, without every one of those services needing its own independent authentication logic or its own copy of user credentials. A **global identity system** centralizes authentication (and often core authorization data) as a shared platform service, issuing tokens (§30.3-30.4) that every other service across the entire organization trusts and verifies via a common, standardized mechanism — directly extending the "don't duplicate cross-cutting logic across every service" argument from §42.3's service mesh discussion to identity specifically. The engineering challenge unique to global scale: this identity system itself must be highly available and low-latency in every region a user might be served from (since authentication sits on the critical path of nearly every request), which typically requires the identity data itself to be replicated globally — directly invoking the multi-region replication and consistency tradeoffs from §34 and §38, now applied to identity and permission data specifically.

### 61.3 Token Revocation at Scale: The Hard Problem §30.3 Deferred

§30.3 flagged that JWTs are hard to revoke before expiration without reintroducing a per-request lookup. At hyperscale, this problem sharpens considerably: a compromised credential or a terminated employee's access must sometimes be revoked *immediately*, globally, across every region and every service simultaneously — but a fully centralized, synchronously-checked revocation list reintroduces exactly the latency and availability cost (a mandatory network round trip to a central store on every single request, globally) that short-lived, self-contained tokens were adopted specifically to avoid. Real hyperscale systems typically resolve this with a layered approach: very short-lived access tokens (minutes, not hours) bound the maximum exposure window of any single compromised token without requiring active revocation at all; a separately, asynchronously-propagated revocation signal (distributed via the same kind of eventually-consistent replication mechanisms from §37) handles the comparatively rare case where even a short exposure window is unacceptable and immediate, active revocation is genuinely required; and critically, the organization accepts and explicitly documents the tradeoff that "immediate" revocation is, in a truly global, highly-available system, actually "propagated within a bounded, short but nonzero window" — precisely the CAP/PACELC tradeoff from §38 applied to security-critical control-plane data, where the "else" (non-partitioned) branch's latency cost of full synchronous consistency is judged not worth paying even for this sensitive a use case, in exchange for a bounded, well-understood, and acceptably short exposure window.

### 61.4 Zero-Trust Architecture: The Full Realization of §5.5 and §17.3's Warnings

§5.5 and §17.3 warned against assuming "internal" traffic is automatically trustworthy. **Zero-trust architecture** is the fully-realized discipline built on that warning, standard practice at hyperscale: every single request, regardless of its origin — from the public internet or from another internal service one network hop away — is authenticated and authorized explicitly, with no implicit trust granted merely because traffic arrived from inside a private network boundary. Concretely, this typically means every service-to-service call carries its own verifiable identity (often via mutual TLS, where both sides of a connection cryptographically prove their identity to each other, not just the client verifying the server as in ordinary TLS, §27.5) and is subject to its own explicit authorization check (§30.6), rather than relying on network-location-based trust (the older, now-discredited "castle and moat" model, where anything inside the perimeter firewall was implicitly trusted). This shift is a direct response to a specific, repeatedly-observed failure mode at scale: once *any* single internal service or credential is compromised, a castle-and-moat model lets that compromise cascade freely to every other internal system reachable from inside the same perimeter, while a zero-trust model contains the blast radius (§1.3.3) to only what that specific compromised identity was explicitly authorized to access.

### 61.5 Common Mistakes and Production Debugging Signals

- Relying on network-location-based trust ("it's an internal service, so we don't need to re-authenticate this call") at a scale where a single compromised internal credential or service can otherwise cascade freely across the entire internal network — precisely the risk zero-trust architecture (§61.4) exists to contain.
- Building a fully synchronous, centrally-checked token revocation system for a global, multi-region platform, only to discover the added latency and availability cost (a mandatory round trip to a central store on every request, globally) is unacceptable at real scale — a direct instance of not having deliberately reasoned through the CAP/PACELC tradeoff from §61.3 and §38 in advance.
- Underestimating the availability requirements of a centralized global identity system (§61.2), such that an outage or elevated latency in the identity platform itself cascades into a platform-wide outage, since authentication sits on the critical path of nearly every request across the organization.

### 61.6 Engineering Intuition

> **How do I know if I need a dedicated global identity platform rather than per-service authentication logic?** Once identity needs to be recognized consistently across enough independently-deployed services that duplicating and keeping authentication logic in sync across all of them becomes its own significant maintenance burden and consistency risk.
>
> **What symptoms indicate a zero-trust gap?** Any incident where a compromised internal service or credential was able to reach far more of the internal system than its actual, legitimate function required — a direct sign that internal traffic was trusted by location rather than verified by identity.
>
> **What metrics indicate a token revocation design problem?** The actual, measured propagation time for a revocation signal to take effect globally, compared explicitly against the organization's stated security requirement for how quickly a compromised credential must be rendered unusable.
>
> **What breaks first if zero-trust isn't adopted at sufficient scale?** A single compromised internal service or credential can move laterally across the entire internal network with no further authentication or authorization checks slowing it down, converting a contained, single-service compromise into an organization-wide breach.
>
> **When is a simpler, non-zero-trust internal trust model acceptable?** At small scale, with a small number of internal services and a small team where network-level access control (a private VPC, §43.5) provides adequate real protection given the actual size of the internal attack surface — zero-trust's full operational overhead (mutual TLS everywhere, per-call authorization) is a cost justified specifically by the scale and blast-radius risk of a large internal service fleet.
>
> **What would a hyperscale company do?** Run a dedicated, globally-replicated identity platform, enforce zero-trust with mutual TLS and per-call authorization for every internal service call without exception, and use short-lived tokens plus asynchronous, bounded-latency revocation propagation as their deliberate, documented tradeoff for the CAP/PACELC-style problem in §61.3.
>
> **What would a two-person startup do?** Use a managed identity provider's standard authentication for all their services, rely on network-level isolation (a private VPC) for basic internal trust, and defer full zero-trust architecture until their internal service count and associated blast-radius risk genuinely justify the investment.
>
> **What changes with scale?** At a small number of internal services, network-boundary-based trust is a reasonable, proportionate simplification. At the scale of hundreds or thousands of internal services spanning multiple regions, the blast-radius risk of that simplification grows large enough that zero-trust architecture and a dedicated global identity platform become necessary, standard practice (§72).

### 61.7 Exercises

1. A compromised internal service is used by an attacker to make unauthorized calls to several unrelated internal systems, none of which independently re-verified the calling service's identity or permissions. Using §61.4, explain what architectural change would have contained this incident to the originally-compromised service alone.
2. Propose a token lifetime and revocation-propagation strategy (per §61.3) for a global platform, explicitly stating the maximum acceptable exposure window for a compromised credential and how your design achieves it without requiring a synchronous, centrally-checked revocation lookup on every single request.

### 61.8 Further Reading

- Rory Ward & Betsy Beyer, "BeyondCorp: A New Approach to Enterprise Security" (Google, 2014) — the influential paper introducing the zero-trust model in production at scale, directly underlying §61.4.
- NIST Special Publication 800-207, "Zero Trust Architecture" — the authoritative, vendor-neutral reference standard for the architecture described in §61.4.

---
