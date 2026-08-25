## 40. Packaging & Deployment — A Presence-Only Tour

### 40.1 The Concept

This chapter is deliberately brief — deployment mechanics aren't Java
language or Spring framework material, but seeing how a service you've spent
this whole book reading actually ships and runs closes a real gap between
"I can read this code" and "I understand this system." Four layers, each
building on the one before: how a service becomes a container image, how a
local dev environment runs the whole platform together, how it's actually
scheduled in production, and how it gets deployed at all.

### 40.2 The Image: Minimal by Design

```dockerfile
FROM eclipse-temurin:21-jre-alpine
COPY target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**Source:** `auth-service/Dockerfile`

Three lines, and every service in the repo has an essentially identical one.
`eclipse-temurin:21-jre-alpine` is a **JRE** (Java Runtime Environment, not a
full JDK) on Alpine Linux (a minimal base image) — small on purpose, since a
running service needs only to *execute* compiled bytecode, not compile
anything. `COPY target/*.jar app.jar` assumes Maven has already built the
fat/uber jar (a single `.jar` containing the compiled service *and* every
dependency it needs) before this Dockerfile ever runs — the actual compile
step (`mvn package`, driven by the root `pom.xml` from Part IX §32) happens
outside this file entirely, in CI or a local build. `ENTRYPOINT` is simply
"run this jar" — the same `SpringApplication.run(...)` from Part II §7.2
executes inside the container exactly as it would on a bare machine.

### 40.3 Local Development: Docker Compose

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: ecommerce
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d ecommerce"]
      interval: 5s
      timeout: 5s
      retries: 20
    networks:
      - ecommerce-network

  redis:
    image: redis:7.4-alpine
    command: redis-server --requirepass "${REDIS_PASSWORD}" --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
    networks:
      - ecommerce-network

  kafka:
    image: apache/kafka:3.9.0
    environment:
      KAFKA_PROCESS_ROLES: broker,controller
      # ... full KRaft-mode Kafka config (no separate Zookeeper needed) ...
    networks:
      - ecommerce-network
```

**Source:** `docker-compose.yml` (trimmed to the infrastructure section — application services follow the same shape, one block each)

This is the piece that makes `http://auth-service:8088` (Part X §33.2)
resolvable at all during local development — every service defined here
joins the same `ecommerce-network`, and Docker's own embedded DNS resolves a
service's name to its container automatically. `healthcheck` blocks matter
for startup ordering: a dependent service can be configured to wait until
Postgres actually reports healthy (not just "container started," which can be
long before Postgres is ready to accept connections) before starting itself.

### 40.4 Production: Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: ecommerce
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  replicas: 1
  template:
    spec:
      initContainers:
        - name: wait-for-keycloak
          image: busybox
          command: ["sh", "-c", "until nc -z keycloak 8080; do sleep 5; done"]
      containers:
        - name: auth-service
          image: ghcr.io/hoangtien2k3/auth-service:latest
          ports:
            - containerPort: 8088
          envFrom:
            - configMapRef:
                name: ecommerce-config
          env:
            - name: SPRING_DATASOURCE_URL
              value: jdbc:postgresql://postgres:5432/authservice
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: POSTGRES_PASSWORD
          startupProbe:
            httpGet:
              path: /actuator/health
              port: 9000
            periodSeconds: 10
            failureThreshold: 30
          readinessProbe:
            httpGet:
              path: /actuator/health
              port: 9000
            periodSeconds: 10
            failureThreshold: 3
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: ecommerce
spec:
  selector:
    app: auth-service
  ports:
    - port: 8088
      targetPort: 8088
```

**Source:** `k8s/backend/auth-service.yaml`

A handful of details tie directly back to earlier chapters, worth
recognizing rather than treating as new: `SPRING_DATASOURCE_URL` and
`POSTGRES_PASSWORD` are exactly the environment variables Part II §8.2's
`application.yml` reads via `${VAR:default}` syntax — this is where those
variables actually get set in production. `startupProbe`/`readinessProbe`
hit `/actuator/health` on port `9000` — Part II §9.2's split management port,
now visibly the reason it exists: Kubernetes itself is the "internal
infrastructure" that config comment referred to. `initContainers` /
`wait-for-keycloak` is a deliberate ordering guard — this Deployment's main
container won't even start until a plain TCP check against Keycloak
succeeds, avoiding a startup race where `auth-service` tries to verify JWTs
(Part VII §24) against an identity provider that isn't listening yet.

### 40.5 Deploying It: GitOps via ArgoCD

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ecommerce-dev
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/hoangtien2k3/ecommerce-microservices.git
    targetRevision: main
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: ecommerce
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

**Source:** `k8s/argocd/application.yaml`

This is **GitOps**: ArgoCD continuously watches the `k8s/` directory of this
exact repository, and `syncPolicy.automated` means it applies any change
there to the real cluster automatically — no separate manual `kubectl apply`
step. `selfHeal: true` goes one step further: if someone manually changed
something in the live cluster (an emergency `kubectl edit`, say), ArgoCD
detects the drift from what's in Git and reverts it back to match — Git, not
the live cluster, is the single source of truth for what *should* be running.

### 40.6 Try It

If someone manually scaled `auth-service`'s `replicas` from `1` to `3`
directly in the cluster (via `kubectl scale`), what would happen shortly
afterward, given `ecommerce-dev`'s `selfHeal: true` setting (§40.5) and the
fact that `replicas: 1` is what's actually committed in
`k8s/backend/auth-service.yaml` (§40.4)?

---
