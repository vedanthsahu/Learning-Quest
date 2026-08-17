## §13. Docker Images, Registries & Multi-Stage Builds

### 1. The Vocabulary

- **Dockerfile** — the recipe for building an image: base image, dependencies, code, startup
  command.
- **Image vs. container** — the image is the packaged, immutable template; a container is a
  running instance of that image.
- **Layer** — each instruction in a Dockerfile creates a cached layer; unchanged layers are
  reused on the next build, which is why instruction *order* affects build speed.
- **Multi-stage build** — using one stage to compile/build (with all the heavy tooling) and a
  second, minimal stage that only copies the final artifact — keeping the shipped image small.
- **Registry** — where built images are stored and pulled from (Docker Hub, ECR, GHCR).

### 2. Where It Sits, and Why Teams Use It

Docker images are the artifact CI/CD builds once and promotes through environments (§12) — the
practical, portable unit of "this is exactly what will run." Layer caching and multi-stage builds
exist purely for speed and image size, which directly affect deploy time and cold-start latency.

### 3. What Actually Breaks

- **Copying source code before installing dependencies** — if the Dockerfile copies the whole
  project first, then installs dependencies, *every* code change invalidates the dependency-
  install layer's cache, making every build slow for no reason. Copy dependency manifests first,
  install, *then* copy the rest of the code.
- **Shipping build tools in the production image** — without a multi-stage build, the final image
  often carries compilers, dev dependencies, and build caches that bloat the image and expand the
  attack surface for no runtime benefit.
- **`latest` tag ambiguity** — deploying `myimage:latest` doesn't guarantee which actual build you
  get over time; pin to a specific tag (often a commit SHA) for anything that needs to be
  reproducible.
- **Registry auth expiring mid-deploy** — a pipeline that can build but suddenly can't push/pull
  because a registry credential expired is a common, avoidable pipeline failure.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I order Dockerfile instructions so the least-frequently-changing steps come first, to get the
  most out of layer caching."
- "A multi-stage build lets me compile with a full toolchain but ship a minimal final image with
  just the runtime and the built artifact."
- "I don't deploy off `latest` — I pin to a specific, traceable tag."

### 5. Interview-Ready Answer

> "A Docker image is the immutable artifact, and a container is a running instance of it. The two
> practical things I pay attention to are layer ordering — dependencies before code, so unrelated
> code changes don't bust the dependency-install cache — and multi-stage builds, so the final
> shipped image doesn't carry the whole build toolchain, just the runtime and the compiled
> output. And I always deploy off a specific tag, never `latest`, so what's running is
> traceable."

### 6. Go Deeper

companion Software Systems Handbook's §44 (Containers Deep Dive: namespaces, cgroups, image
layers) chapter (image layers, container runtime internals); companion Cloud Engineering
Playbook's §3 (Running Containers on AWS: ECS & EKS) chapter.

---
