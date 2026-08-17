## Project 01: URL Shortener

### Problem Statement

A marketing team wants to share long, unwieldy links in emails, social posts, and printed materials without the links looking messy or getting truncated by character limits. They want a way to turn any long web address into a short one that, when visited, sends the visitor to the original destination. They also want to know, at a glance, how many times each short link has been used.

### Functional Requirements

- Given a long URL, produce a short, unique identifier that can be shared instead.
- Visiting the short identifier sends the visitor to the original long URL.
- The system should report how many times a given short link has been visited.
- A user should be able to optionally choose their own custom short identifier instead of a generated one.

### Non-Functional Requirements

- **Latency**: visiting a short link and being redirected should feel instantaneous to a human.
- **Scalability**: the number of times links are *visited* will vastly exceed the number of times new links are *created*.
- **Availability**: a short link, once created, should keep working reliably for a long time — treat "the link is dead" as a failure worth avoiding.
- **Security**: think about what happens if someone tries to create a short link for a malicious destination, or tries to guess other people's short links.
- **Cost**: the system should not need to store data it doesn't actually need.

### Project Scope

**In scope**: creating short links, redirecting, visit counting, optional custom aliases. **Out of scope for this project**: user accounts/ownership of links, link expiration policies, analytics beyond a simple visit count, a UI (assume an API only).

### Engineering Questions (Answer Them Yourself First)

- How long should a short identifier be, and what determines that length?
- What should happen if two different users try to create the exact same custom alias?
- What should happen if someone requests a short identifier that was never created?
- Given that visits vastly outnumber creations, what does that imply about where you should spend your design effort?
- How would you know, without guessing, whether your system can handle the traffic it needs to?

### Architecture Thinking

Before looking at any hints, sketch your own answer to these three prompts: (1) Draw the path a request takes when a *new* short link is created — what does it touch, in what order? (2) Draw the path a request takes when someone *visits* a short link — is it the same path in reverse, or fundamentally different? (3) Estimate: if this system needs to serve 1,000 redirects per second at peak, what does that suggest about how you store and look up the mapping between short and long URLs? Don't reach for a specific technology yet — just reason about the shape of the problem.

### Progressive Hint System

**Level 1**: Think about the difference between how often data is written versus how often it's read here — does that difference suggest anything about which operation deserves more of your design attention? **Level 2**: Consider what happens to your design if you assume most redirect requests will ask for a short link that was recently created or is generally popular — is there a way to avoid hitting your primary data store for every single redirect? **Level 3**: Look into a caching layer sitting in front of your primary lookup, and consider what a very fast in-memory key-value store gives you that a general-purpose relational database doesn't for this specific access pattern. **Level 4**: A common design uses a database or key-value store as the source of truth for the short-to-long mapping, with a cache (like Redis) in front of it for reads; short-code generation is typically either an encoded auto-incrementing counter or a randomly generated string with a uniqueness check; visit counts are usually incremented asynchronously rather than synchronously blocking the redirect itself.

### Common Engineering Traps

- **Generating a random code and checking for a collision on every single creation** — this seems fine at small scale but has a real cost curve as the total number of existing codes grows. Why might this matter more than it first appears to?
- **Incrementing a visit counter synchronously, in the same request that performs the redirect** — what does this do to redirect latency, and is there a reason this might matter more than it seems?
- **Storing the full long URL directly in a cache key or as part of the short code itself** — what's actually wrong with this, beyond it "feeling odd"?
- **Assuming short codes can safely be sequential and predictable** — what could someone do with a predictable sequence of short codes that they couldn't do with random ones?

### Reflection Questions

- If you had to redesign this system knowing from day one that reads would outnumber writes 1000-to-1, would anything about your initial design change?
- What is the actual failure mode if your cache goes down entirely — does your system stop working, or does it just get slower? Which did you design for?
- Is there a version of this system that doesn't need a cache at all? Under what real-world condition would that version be the right choice?

### Completion Checklist

- [ ] I can explain, out loud, why redirects and creations should probably be treated as different problems.
- [ ] I have a concrete answer for what happens when a custom alias collides with an existing one.
- [ ] I have decided, and can justify, whether visit counting is synchronous or asynchronous.
- [ ] I have identified at least one thing that could go wrong at scale that wouldn't show up in a small local test.
- [ ] I am ready to compare my reasoning against the Solution Guide — not before finishing the above.

---
