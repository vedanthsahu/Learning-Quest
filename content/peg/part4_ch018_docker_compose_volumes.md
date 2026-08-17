## §18. Docker in Practice: Images, Compose, Volumes

### 1. The Vocabulary

- **Docker Compose** — a config file describing multiple related containers (app, database,
  cache) and how they network together, run with one command.
- **Volume** — persistent storage that survives a container being removed and recreated; without
  one, anything a container writes to its own filesystem disappears when it's gone.
- **Bind mount** — mapping a specific host folder into a container (common for live-reloading
  local source code into a dev container).
- **Container environment variable** — set via `docker run -e`, a Compose file's `environment:`
  block, or an env file — the container-level version of §11's environment variables.

### 2. Where It Sits, and Why Teams Use It

Compose is how most local development environments are actually run day to day — "spin up the
whole stack with one command" instead of manually starting a database, a cache, and the app
separately in the right order.

### 3. What Actually Breaks

- **Data disappearing after `docker-compose down`** — without an explicit volume for the
  database's data directory, every container recreation starts from a truly empty database. This
  is often the actual cause of "my local dev data keeps vanishing."
- **Bind-mounting source code but forgetting dependencies were installed inside the container's
  own filesystem** — the mount can shadow the very folder dependencies were installed into,
  producing confusing "module not found" errors that don't happen without the mount.
- **Services starting in the wrong order** — the database container takes a few seconds longer to
  be *actually ready* than to just exist; an app container that connects immediately on startup
  can fail before the database has finished initializing, even with a `depends_on` — that only
  controls container start order, not readiness.
- **Hardcoded `localhost` for cross-container communication** — inside Compose's network, one
  container reaches another by its *service name*, not `localhost` — `localhost` inside container
  A is container A, not container B (see §17).

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Anything that needs to survive a container restart needs an explicit volume — the container's
  own filesystem is disposable by default."
- "`depends_on` controls start order, not actual readiness — for real 'wait until the database can
  accept connections' behavior I need a retry loop or a proper healthcheck-based wait."
- "Containers on the same Compose network talk to each other by service name, not `localhost`."

### 5. Interview-Ready Answer

> "Compose's job is coordinating multiple related containers and their networking with one
> config file. The two things that trip people up most: data doesn't survive a container being
> recreated unless it's on an explicit volume, and `depends_on` only guarantees start order, not
> that the dependency is actually ready to accept connections yet — for that you need a real
> readiness check or retry logic in the app itself."

### 6. Go Deeper

companion Software Systems Handbook's §14 (Mental Model: Containers & Kubernetes) chapter;
companion Python Backend Engineering Handbook's §69 (Deployment Readiness) chapter.

---
