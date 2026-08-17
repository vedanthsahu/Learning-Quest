## §19. Why It Works Locally But Fails in Production

### 1. The Vocabulary

- **Environment parity** — how closely dev/staging match production in OS, dependency versions,
  data volume, and configuration.
- **Configuration drift** — the gradual, often undocumented divergence between environments over
  time.
- **Data volume difference** — production has real, large, messy data; local/dev usually has a
  tiny clean seed set.

### 2. Where It Sits, and Why Teams Use It

This isn't one specific technology — it's the single most common category of confusing bug report
a working engineer will hit, and almost every instance traces back to one of a small number of
root causes.

### 3. What Actually Breaks

- **Different dependency versions** — "works on my machine" because a locally-cached older
  version of a library behaves differently than the one actually pinned/installed in production.
- **Case-sensitivity differences** — a file path or import that resolves fine on a case-
  insensitive local filesystem (common on Mac/Windows) breaks on a case-sensitive one (Linux,
  which most production servers run).
- **Data volume exposes a bug that doesn't show at small scale** — an unindexed query, an N+1, or
  an O(n²) loop is invisible with 20 local test rows and a real production incident with 2
  million rows.
- **Missing environment variable or credential** — the local `.env` file has something production
  was never given, and the app fails at exactly the point it needs that value.
- **Network/firewall differences** — production sits behind security groups, VPCs, or a proxy
  that local development simply doesn't have, so a service that's directly reachable locally is
  silently unreachable in production.
- **Timezone/locale differences** — the production server's default timezone or locale differs
  from the developer's machine (see §90).

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "When something works locally and fails in production, I check dependency versions, data
  volume/shape, environment variables, and network reachability, roughly in that order, before
  assuming it's a genuine code bug specific to production."
- "I try to keep local/staging as close to production as realistically possible, specifically to
  shrink this whole category of bug."
- "Case sensitivity between filesystems is a real, recurring gotcha between Mac/Windows
  development and Linux production."

### 5. Interview-Ready Answer

> "This almost never means production is 'special' — it means something differs between the two
> environments, and the job is finding what. My checklist is dependency versions, data volume and
> shape, environment variables and secrets, and network/firewall differences. The biggest
> systemic fix is keeping environments as close to parity as possible, so this class of bug has
> fewer places to hide in the first place."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §69 (Deployment Readiness) chapter; companion
Software Systems Handbook's §46 (CI/CD Mechanics: pipelines, blue-green, canary, rolling) chapter.

---
