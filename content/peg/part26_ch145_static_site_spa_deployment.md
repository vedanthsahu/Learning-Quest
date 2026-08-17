## §145. Static Site and SPA Deployment Patterns

### 1. The Vocabulary

- **S3 + CloudFront + OAC (Origin Access Control)** — the standard AWS pattern for hosting a
  static site or SPA: files sit in a *private* S3 bucket, and CloudFront (with OAC) is the only
  thing allowed to read them, then serves them globally through a CDN.
- **Platform-managed hosting (Vercel, Netlify)** — an alternative that bundles build, CDN, and
  cache invalidation into one workflow, trading some control for far less infrastructure to
  manage directly.
- **Cache invalidation via hashed filenames** — modern build tools output files named
  `main.a1b2c3.js` instead of `main.js`; a new deploy produces a new hash, so browsers and CDNs
  naturally fetch the new file without needing an explicit cache-clear for that specific file.
- **Build-time vs runtime environment variables** — a frontend's environment variables are
  typically baked into the JavaScript bundle at build time, not read at runtime — a critical
  distinction from a backend's environment variables, which are read fresh at process startup.

### 2. Where It Sits, and Why Teams Use It

The specific reason S3+CloudFront+OAC beats "public S3 bucket serving as a static website" (the
older pattern, still documented, still a trap — §67) is that OAC keeps the bucket entirely private
and lets only CloudFront read from it, getting CDN caching, HTTPS, and custom domains without ever
making the bucket itself public. Platform-managed hosting exists for teams that would rather not
own that infrastructure at all — a reasonable, common tradeoff for smaller projects or teams
without dedicated infrastructure ownership.

### 3. What Actually Breaks

- **Frontend env vars assumed to work like backend ones** — setting an environment variable in the
  hosting platform *after* a build was already produced does nothing, because the value was already
  baked into the bundle at build time; a new build is required for the new value to take effect —
  a very common and very confusing deployment trap.
- **No hashed filenames on build output, but aggressive CDN caching enabled** — users can get stuck
  on an old version of the app indefinitely, since the CDN has no signal that `main.js` changed.
- **The old "S3 static website hosting" checkbox left enabled alongside CloudFront** — leaves a
  second, unintended public entry point to the bucket's contents that bypasses CloudFront entirely
  (the exact trap in §67).
- **SPA routing not configured for deep links** — a user refreshing the page on `/dashboard/settings`
  gets a 404 from the CDN/S3 directly, because there's no actual file at that path; the fix is
  routing all unknown paths back to `index.html` and letting client-side routing take over.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I know frontend environment variables get baked in at build time, not read at runtime — a
  config change needs a rebuild, not just a redeploy of the same artifact."
- "I rely on hashed filenames for cache-busting rather than manually invalidating the CDN on every
  deploy."
- "For a private-bucket-plus-CDN setup, I use CloudFront with Origin Access Control specifically so
  the bucket itself never needs to be public."

### 5. Interview-Ready Answer

> "For a static site or SPA, I'd default to a private S3 bucket behind CloudFront with Origin
> Access Control, rather than the older public-bucket static-website-hosting pattern, since OAC
> keeps the bucket private while still getting CDN caching and HTTPS. I rely on hashed build
> filenames for cache invalidation instead of manual purges, and I make sure the SPA's unknown
> paths route back to `index.html` so deep-linked routes don't 404 on refresh. And I'm careful that
> frontend environment variables are baked in at build time — changing one means rebuilding, not
> just redeploying."

### 6. Go Deeper

companion Cloud Engineering Playbook's §8 (CloudFront) chapter and companion Cloud Engineering
Playbook's §4 (S3) chapter for the full OAC setup and CDN invalidation mechanics; this book's §4
(caching layers) and §67 (S3 static website trap) for the adjacent CDN and privacy concerns.

---
