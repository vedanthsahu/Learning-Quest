## §4. Caching Layers: Browser, CDN, and Server

### 1. The Vocabulary

- **Browser cache** — the requesting browser's own local copy of a response.
- **CDN cache** — a copy stored at an edge location geographically close to the user, in front of
  your actual server (see companion Cloud Engineering Playbook's §8, CloudFront, for the deep
  version).
- **Server/app cache** — a cache your own backend maintains (often Redis — see Part VII).
- **`Cache-Control`** — the response header controlling all of the above: `no-store` (never
  cache), `no-cache` (cache but revalidate every time), `max-age=N` (cache for N seconds),
  `public`/`private` (can/can't be cached by shared caches like a CDN).
- **Static vs. dynamic** — a static asset (JS bundle, image) is the same for everyone and safe to
  cache aggressively; a dynamic API response is often per-user and needs care.

### 2. Where It Sits, and Why Teams Use It

There isn't one cache — there are (at least) three, stacked between the user and your database,
each with its own invalidation rules. Understanding which layer served a given response is often
the entire debugging task when someone says "I made a change and it's not showing up."

### 3. What Actually Breaks

- **"I deployed but users still see the old version"** — could be the browser cache, could be the
  CDN cache, could be both, and each needs a different fix (cache-busting filenames for the
  browser, an explicit invalidation for the CDN).
- **CDN serving stale content longer than expected** — CDNs often cache error responses or
  respect `stale-while-revalidate` semantics that keep serving old content while quietly
  refreshing in the background; a single `max-age` setting doesn't tell the whole story.
- **Caching a per-user response as if it were public** — a `public, max-age=3600` on a response
  that includes another user's data is a real, serious data-leak bug, not just a staleness bug.
- **Assuming `no-cache` means "don't cache"** — it actually means "cache it, but check with the
  server before using it" (a conditional request); `no-store` is the one that means never cache
  at all.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "There are at least three cache layers between a user and my server, and 'it's not updating'
  requires figuring out which one is stale."
- "Static assets get long cache lifetimes plus a content hash in the filename so a new deploy
  gets a new URL, not a cache invalidation problem."
- "I never mark a per-user or sensitive response as publicly cacheable."

### 5. Interview-Ready Answer

> "When someone says a change 'isn't showing up,' I check three layers: the browser's own cache,
> a CDN if there is one, and any server-side cache like Redis. For static assets I avoid the
> problem entirely with content-hashed filenames — a new file, a new URL, no invalidation needed.
> For dynamic, per-user responses, I'm careful never to mark them publicly cacheable, since a CDN
> or shared cache could serve one user's data to another."

### 6. Go Deeper

companion Software Systems Handbook's §10 (Mental Model: Caching) and companion Software Systems
Handbook's §39 (Caching Mechanics: eviction, write strategies, stampede/avalanche) chapters;
companion Cloud Engineering Playbook's §8 (CloudFront) chapter.

---
