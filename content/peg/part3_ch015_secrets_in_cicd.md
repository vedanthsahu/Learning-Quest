## §15. Secrets in CI/CD and Why They Leak

### 1. The Vocabulary

- **Secret** — an API key, password, or token that must never appear in source code or logs.
- **CI secret store** — the pipeline platform's built-in mechanism (GitHub Actions Secrets, etc.)
  for injecting secrets as environment variables at build/deploy time without exposing them in
  config files.
- **Masking** — CI platforms automatically redact known secret values from log output — but only
  the exact value they were given, not derived or partially-transformed versions of it.

### 2. Where It Sits, and Why Teams Use It

CI/CD pipelines routinely need real credentials to deploy, run integration tests, or push images
— but the pipeline definition itself is often just a file in the same repo everyone can read.
Secret stores exist to separate "who can see this config" from "who can see this deploy
credential."

### 3. What Actually Breaks

- **A secret committed to git, even briefly** — once it's in git history, deleting the file later
  doesn't remove it from history; the secret must be rotated (treated as compromised), not just
  deleted.
- **Printing environment variables for debugging** — a stray `print(os.environ)` or `env` command
  left in a CI script dumps every injected secret straight into build logs, which are often far
  more widely readable than the secret was ever meant to be.
- **Masking failing on a transformed value** — CI log masking usually matches the literal secret
  string; if the pipeline base64-encodes it, splits it, or logs it inside a larger JSON blob, the
  masking can miss it entirely.
- **Secrets baked into a Docker image layer** — copying a `.env` file into an image during build
  means the secret is now sitting in that image layer, retrievable by anyone who can pull the
  image, even after the file is later "removed" in a subsequent layer.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "A secret that's ever been committed to git has to be rotated, not just removed from the latest
  commit — history keeps it."
- "I never log environment variables wholesale, and I'm suspicious of any debug output that might
  include one indirectly."
- "Secrets get passed into a container at runtime, not baked into the image at build time."

### 5. Interview-Ready Answer

> "The most common way secrets leak isn't a dramatic breach — it's a debug print statement, a
> committed .env file, or a secret baked into a Docker image layer. My rule is that a secret gets
> injected at runtime via the CI platform's secret store or the container's environment, never
> written into a file that gets committed or baked into an image, and never printed for debugging.
> If one ever does end up somewhere it shouldn't, the fix is rotating it, not just deleting the
> line — git history and image layers keep old versions around."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §62 (Secrets, Password Hashing & Secure File
Uploads) chapter; companion Cloud Engineering Playbook's §17 (Secrets & Encryption: Secrets
Manager & KMS) chapter.

---
