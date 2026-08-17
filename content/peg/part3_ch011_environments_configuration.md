## §11. Environments & Configuration: Dev, Staging, Prod

### 1. The Vocabulary

- **Local / dev / staging / production** — increasingly production-like environments, each
  meant to catch a different class of problem before real users see it.
- **Environment variable** — a config value injected at process startup (not baked into code),
  the standard way to vary behavior per environment without a code change.
- **Build-time config** vs **runtime config** — values baked into the artifact when it's built
  (can't change without rebuilding) vs. values read when the process starts (can change without
  rebuilding, just a restart).

### 2. Where It Sits, and Why Teams Use It

Separate environments exist so that a mistake gets caught somewhere other than in front of real
users and real data. The whole point of environment variables is that the *same build artifact*
runs unmodified in every environment — the environment, not the code, decides which database or
API key it talks to.

### 3. What Actually Breaks

- **"I changed an environment variable and the app is still using the old value"** — most runtimes
  only read env vars at process startup; changing the value without restarting the process does
  nothing.
- **Baking a value in at build time that should have been runtime config** — e.g. hardcoding an
  API URL into a frontend bundle means every environment needs its own build, instead of one
  build configured differently per environment.
- **Staging drifting from production** — different instance sizes, different data volume,
  different feature flags — enough drift and "it worked in staging" stops meaning anything.
- **Using production credentials in a lower environment "just to test something quick"** — a
  classic way real data gets touched, deleted, or leaked by accident.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Changing an env var usually requires a restart or redeploy — it's not picked up live unless the
  app specifically watches for it."
- "The same build artifact should run in every environment; only the configuration around it
  changes."
- "I keep staging as close to production as realistically possible, because the value of staging
  is directly proportional to how well it predicts production behavior."

### 5. Interview-Ready Answer

> "Environments exist to catch problems progressively before they hit real users. The discipline
> that makes this actually work is building one artifact and configuring it differently per
> environment via runtime environment variables, rather than baking environment-specific values
> into the build — otherwise you're not really testing the same thing you'll ship. And a change to
> an environment variable typically needs a restart, since most processes only read their
> environment once at startup."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §8 (Logging, Packaging, Virtual Environments &
Dependencies) chapter; companion Software Systems Handbook's §46 (CI/CD Mechanics: pipelines,
blue-green, canary, rolling) chapter.

---
