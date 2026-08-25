# Java Handbook — Proposed Table of Contents (not a reader chapter)

Draft ToC built from `_concept_inventory.md`, grouped into coherent chapters
(not one chapter per bullet). Pending Sreedhar's sign-off before any chapter is
written or `data.json` is touched. Numbering is provisional.

## PART 0 — Orientation
- 0.1 How this book works (explanation → real snippet → vscode:// deep link → plain path)
- 0.2 Map of the codebase (14 services + common-lib; the "modern vs legacy era" split)
- 0.3 Reading it alongside the real repo (confirming the deep links open VS Code)

## PART I — Core Java, the Spring Way
- 1.1 Records as immutable DTOs (ApiResponse, SecurityProperties, PageResponse)
- 1.2 Generics in practice (BaseMapper<M,V>, DtoCollectionResponse<T>, PageResponse.map)
- 1.3 Enums beyond constants (RoleName, rich PaymentStatus, ErrorCode as a catalog)
- 1.4 Streams & Optional (ProductServiceImpl.findAll, UserServiceImpl.findById/findByUsername)
- 1.5 Exceptions as a hierarchy (BusinessException factories vs legacy per-exception classes)
- 1.6 Interfaces, statics, final, recursion (ProductService split, ProductMappingHelper, final Product, self-referencing Category)

## PART II — Spring Boot Foundations
- 2.1 Anatomy of a Spring Boot app (AuthServiceApplication)
- 2.2 Configuration & profiles (application.yml, env-var defaults, virtual threads, @ConfigurationProperties on a record)
- 2.3 Actuator & OpenAPI
- 2.4 Building your own starter (RestClientAutoConfiguration: @AutoConfiguration/@ConditionalOnClass/@ConditionalOnMissingBean/@ConditionalOnProperty)
- 2.5 Startup seeding & schema migration (CommandLineRunner, Liquibase, ddl-auto:validate)

## PART III — Dependency Injection & Layering
- 3.1 Constructor injection (Lombok vs explicit)
- 3.2 The @Service/@Repository/@Component triad, and where @Bean/@Configuration fits

## PART IV — REST APIs
- 4.1 Building a controller (ProductController: mappings, @Valid, CRUD)
- 4.2 Securing endpoints (@PreAuthorize on OrderController)
- 4.3 Pagination, sorting, response envelopes (ApiResponse<T> vs raw ResponseEntity<T> — deliberate contrast)
- 4.4 A non-CRUD controller: OAuth2 redirects (AuthController ssoLogin/ssoCallback)

## PART V — Persistence with Spring Data JPA
- 5.1 Entities & validation (User.java)
- 5.2 Relationships (@ManyToMany, bidirectional @OneToMany/@ManyToOne, self-referencing Category, @JsonIgnore cycle-breaking)
- 5.3 Repositories: marker interfaces → derived queries → custom JPQL
- 5.4 Auditing for free (AbstractAuditEntity, AuditorAwareImpl)
- 5.5 Who owns the schema? (Liquibase vs Hibernate ddl-auto)

## PART VI — Mapping Between Layers
- 6.1 Four ways to map a DTO in one codebase (manual helper, BeanUtils.copyProperties, ModelMapper, MapStruct) — compare/contrast chapter

## PART VII — Security & Identity
- 7.1 JWT resource server basics (filter chain, stateless sessions, public allow-list)
- 7.2 Method security in practice (@EnableMethodSecurity + @PreAuthorize)
- 7.3 Sharing security config across services (SecurityAutoConfiguration vs legacy duplicated configs)
- 7.4 Keycloak integration (role converter, admin client, compensating rollback)
- 7.5 Implementing SSO end-to-end (AuthController's 3-step flow, open-redirect protection)
- 7.6 Reading the current user (SecurityContextHolder / JWT principal)

## PART VIII — Handling Failure
- 8.1 One place for all errors (ApiExceptionHandler)
- 8.2 Designing an exception (BusinessException vs legacy typed exceptions)
- 8.3 Messages that aren't hardcoded (i18n 3-tier fallback)

## PART IX — Multi-Module Maven
- 9.1 How this repo is actually built (parent POM, dependencyManagement, nested common-lib aggregator, ${revision} versioning)

## PART X — Talking Between Services
- 10.1 Calling another service over HTTP (CallAPI, pooled RestClient + correlation IDs)
- 10.2 When calls fail: circuit breakers (Resilience4j + fallback template method)
- 10.3 Events instead of calls: Kafka (producer, config beans, CDC consumer)
- 10.4 Search as its own service (Elasticsearch + Kafka sync)
- 10.5 Tracing a request across services (correlation ID filter + MDC)
- 10.6 Object storage as a service (S3ObjectStorageService, presigned URLs)

## PART XI — Cross-Cutting Concerns with AOP
- 11.1 Aspects and annotations (LoggerAspect @Around, @LogPerformance)

## PART XII — Packaging & Running It For Real
- 12.1 Dockerfile, docker-compose, k8s manifests, ArgoCD — brief, presence-only tour

## PART XIII — Testing What's There
- 13.1 JUnit5 + Mockito in this repo
- 13.2 What's NOT tested, and why that matters (the real coverage gap)

## PART XIV — Capstone
- 14.1 Trace one real request end-to-end (e.g. place an order) through controller → security → service → mapper → repository → DB and back, citing every file it actually touches

---

~45 topics across 14 parts. For comparison, pbh runs ~92 chapters — this is
intentionally leaner since it's teaching from a fixed, finite codebase rather
than building a capstone from scratch.

## Proposed rollout order (batches, not all at once)
1. Part 0 + Part I — also proves the vscode:// deep link actually works before scaling up.
2. Part II - IV (Spring Boot, DI, REST)
3. Part V - VI (JPA, Mapping)
4. Part VII - VIII (Security, Exceptions)
5. Part IX - XI (Build, Microservices, AOP)
6. Part XII - XIV (Deployment, Testing, Capstone)
