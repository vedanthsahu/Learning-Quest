# Java Handbook — Concept Inventory (not a reader chapter)

Raw catalog from surveying `C:\Vedanth_Space\4_ecommerce-java`, produced once by an
Explore agent (63 file reads, ~207s) — kept verbatim here so it's never re-derived.
Source of truth for drafting the table of contents in `_authoring_notes.md`.

Repo shape note: two coding "eras" coexist and are both worth teaching — a
**modern layer** (auth-service + common-lib: Keycloak/OAuth2, records, ModelMapper,
AOP logging, autoconfiguration modules) and a **legacy/classic layer**
(order-service, product-service, payment-service, notification-service,
inventory-service: manual mapper helpers, `BeanUtils.copyProperties`, per-service
duplicated `SecurityConfig`, Kafka). Contrasting the two is itself good teaching
material ("why did they extract common-lib?").

## Core Java
- Records for immutable DTOs — `common-lib/common-core/src/main/java/com/ecommerce/commonlib/viewmodel/ApiResponse.java` — `record ApiResponse<T>(...)` L24
- Records with compact constructor validation — `common-lib/common-security/src/main/java/com/ecommerce/commonlib/security/SecurityProperties.java` — `record SecurityProperties(...)` L26, compact ctor L43
- Generic record with type parameter — `common-lib/common-core/src/main/java/com/ecommerce/commonlib/viewmodel/PageResponse.java` — `record PageResponse<T>` L18, `map(Function<? super T, ? extends R>)` L48
- Generic interface — `common-lib/common-spring/src/main/java/com/ecommerce/commonlib/mapper/BaseMapper.java` — `interface BaseMapper<M, V>` L13
- Simple generic wrapper class — `product-service/src/main/java/com/ecommerce/productservice/dto/response/collection/DtoCollectionResponse.java` — L14
- Enums — `auth-service/src/main/java/com/ecommerce/authservice/entity/RoleName.java` — `enum RoleName {USER, PM, ADMIN}` L3
- Rich enum (fields/constructor) — `payment-service/src/main/java/com/ecommerce/paymentservice/entity/PaymentStatus.java` — L8, `@RequiredArgsConstructor` L6
- Enum as machine-readable catalog — `common-lib/common-core/src/main/java/com/ecommerce/commonlib/exception/ErrorCode.java` — L14, code/messageKey/HttpStatus per constant L17-60
- Streams (map/filter/collect/distinct) — `product-service/src/main/java/com/ecommerce/productservice/service/impl/ProductServiceImpl.java` — `findAll()` L28-35
- Streams with Optional chaining — `auth-service/src/main/java/com/ecommerce/authservice/service/UserServiceImpl.java` — `findById` L114-118, `.orElseThrow(...)`
- Optional as return-type contract — `auth-service/.../repository/UserRepository.java` (`findByUsername`), used in `UserServiceImpl.findByUsername` L121-124
- Custom exception hierarchy (private ctor + static factories) — `common-lib/common-core/src/main/java/com/ecommerce/commonlib/exception/BusinessException.java` — L52-114
- Legacy per-exception classes (pre-BusinessException) — `product-service/.../exception/wrapper/ProductNotFoundException.java`, `CategoryNotFoundException.java`
- Interface/impl separation for service layer — `product-service/.../service/ProductService.java` vs `service/impl/ProductServiceImpl.java`
- Static interface methods as mapper utility — `product-service/.../helper/ProductMappingHelper.java` — L8-24
- `final` entity classes — `product-service/.../entity/Product.java` — `public final class Product extends AbstractMappedEntity` L15
- Recursive/self-referential structure — `product-service/.../entity/Category.java` — parent/subCategories L34-40
- `Serializable` + `serialVersionUID` — `product-service/.../entity/Product.java` L17-18

## Spring Boot basics
- App entry point — `auth-service/.../AuthServiceApplication.java` — `@SpringBootApplication` L6, `SpringApplication.run` L10
- Multi-document YAML profiles — `auth-service/src/main/resources/application.yml` — `---` separators L1-135
- Externalized config w/ env-var defaults — same file L19-21
- Virtual threads enabled — same file L10-12
- `@ConfigurationProperties` bound onto a record — `common-lib/common-security/.../SecurityProperties.java` L25
- Actuator + management port separation — `application.yml` L58-67
- Custom auto-configuration module (starter pattern) — `common-lib/common-spring/.../autoconfigure/RestClientAutoConfiguration.java` — `@AutoConfiguration`, `@ConditionalOnClass`, `@ConditionalOnMissingBean` L39-76
- `@ConditionalOnProperty` feature toggle — `common-lib/common-security/.../SecurityAutoConfiguration.java` L28
- Auto-config module wiring rationale (Javadoc) — same file L13-23, `@Import(BaseSecurityConfig.class)` L31
- `CommandLineRunner` startup seeding — `inventory-service/.../util/DataLoader.java` L11-16
- OpenAPI/Swagger integration — `common-lib/common-spring/.../openapi/OpenApiFactory.java` + `application.yml` L69-78
- Liquibase-managed schema migrations — `application.yml` L31-33 + `db/changelog/db.changelog-master.yaml`

## Dependency injection
- Constructor injection via Lombok — `auth-service/.../service/UserServiceImpl.java` — `@RequiredArgsConstructor` L28, `final` fields L31-34
- `@Service`/`@Repository`/`@Component` three-tier layering — auth-service package layout
- `@Component` stateless HTTP collaborator — `order-service/.../service/CallAPI.java` L10-11
- Explicit (non-Lombok) constructor injection — `common-lib/common-storage/.../S3ObjectStorageService.java` L34-38
- `@Bean`/`@Configuration` bean definitions — `payment-service/.../config/kafka/CommonConfiguration.java` L22-35

## REST controllers
- `@RestController`/`@RequestMapping` + CRUD verbs — `product-service/.../controller/ProductController.java` L18, L25-71
- `@Valid` body + path-variable validation — same file L40-45, L32-34
- Method-level `@PreAuthorize` on endpoints — `order-service/.../controller/OrderController.java` L30, L55
- OpenAPI `@Tag` on controller — same file L22
- Redirect-based (302) OAuth2 Authorization Code flow endpoints — `auth-service/.../controller/AuthController.java` — `ssoLogin` L56-71, `ssoCallback` L77-93
- Query-param pagination/sorting — `UserServiceImpl.findAllUsers` L126-133, `OrderController.java` L36-43
- Uniform `ApiResponse<T>` envelope vs raw `ResponseEntity<T>` — `AuthController.java` (e.g. L43-46) vs order/product-service — deliberate contrast point

## Spring Data JPA
- `@Entity` + Lombok + Bean Validation on columns — `auth-service/.../entity/User.java` L29-57
- `@ManyToMany` + `@JoinTable` — same file, `roles` L62-68
- `@NaturalId` (business key vs surrogate PK) — `User.java` L39, `Role.java` L22
- Bidirectional `@OneToMany`/`@ManyToOne` — `order-service/.../entity/Cart.java` L31-32 ↔ `entity/Order.java` L50-52
- Self-referencing parent/child — `product-service/.../entity/Category.java` L34-40
- `@JsonIgnore` to break JPA/JSON serialization cycles — `Cart.java` L30, `Category.java` L34,42
- Plain `JpaRepository<T, ID>` marker interface — `product-service/.../repository/ProductRepository.java` L6
- `PagingAndSortingRepository` + custom JPQL `@Query` — `product-service/.../repository/CategoryRepositoryPagingAndSorting.java` L11-12
- Derived query methods (`existsByX`) — `UserServiceImpl.existsByUsername/Email/PhoneNumber` L142-152
- `Page<T>`/`PageRequest`/`Sort` in a service — `UserServiceImpl.findAllUsers` L126-133
- `@MappedSuperclass` auditing (`@CreationTimestamp`, `AuditingEntityListener`) — `common-lib/common-spring/.../data/AbstractAuditEntity.java` L31-50 + `AuditorAwareImpl.java`
- `ddl-auto: validate` + Liquibase-owned schema — `application.yml` L24-33

## Mapping layer
- MapStruct-style contract (`@BeanMapping` IGNORE for PATCH semantics) — `common-lib/common-spring/.../mapper/BaseMapper.java` L23-24
- Real MapStruct `@Mapper` interface — `media-service/.../mapper/MediaVmMapper.java`
- ModelMapper component mixed with manual builder mapping — `auth-service/.../mapper/UserMapper.java` L18-31
- Fully manual static mapper helper (no library) — `product-service/.../helper/ProductMappingHelper.java` L9-41
- `BeanUtils.copyProperties` shallow-copy w/ exclusion list — `product-service/.../service/impl/ProductServiceImpl.java` L60-69, L71-81

## Spring Security / Auth
- OAuth2 Resource Server (JWT) filter chain — `auth-service/.../config/SecurityConfig.java` — `securityFilterChain` L29-41
- Stateless session + CSRF disabled — same file L33-34
- Public endpoint allow-list — same file L17-27
- `@EnableMethodSecurity` + `@PreAuthorize` — `SecurityConfig.java` L14, `OrderController.java` L30,37,46,55,64,73,85
- Shared cross-service security auto-configuration — `common-lib/common-security/.../SecurityAutoConfiguration.java` L25-33 + `BaseSecurityConfig.java`
- Custom `JwtAuthenticationConverter` (Keycloak realm-role → Spring authorities) — `common-lib/common-security/.../KeycloakRealmRoleConverter.java`
- Backend-mediated SSO / Authorization Code flow — `AuthController.java` L52-101, single-use ticket via `SsoSessionStore`
- Anti open-redirect allow-list — `AuthController.java` — `resolveFrontendRedirect` L122-128
- Keycloak Admin REST client + compensating rollback on failure — `common-lib/common-keycloak/.../KeycloakAuthClient.java`, used in `UserServiceImpl.register` L51-72
- Reading principal/JWT from `SecurityContextHolder` — `order-service/.../security/JwtTokenFilter.java` L12-18, `rating-service/.../service/OrderService.java` L24
- Legacy duplicated per-service `SecurityConfig` (pre-common-security) — `product-service/.../config/SecurityConfig.java`, `search-service/.../config/SecurityConfig.java`

## Exception handling
- Global `@RestControllerAdvice`, one handler per exception type — `common-lib/common-spring/.../web/exception/ApiExceptionHandler.java` L56-59 through L191-197, `@Order(LOWEST_PRECEDENCE)` L44
- Bean Validation error aggregation — same file — `handleMethodArgumentNotValid` L65-72, `handleConstraintViolation` L84-91
- Root-cause unwrapping for logging — same file L236-239
- `BusinessException` (embedded HTTP status + error code) — `common-lib/common-core/.../exception/BusinessException.java` L25-46
- Legacy per-service typed exceptions — `payment-service/.../exception/wrapper/PaymentNotFoundException.java`, `order-service/.../CartNotFoundException.java`, `OrderNotFoundException.java`
- i18n-aware error messages (3-tier fallback) — `common-lib/common-core/.../i18n/Messages.java` L41-69

## Build system (multi-module Maven)
- Aggregator/parent POM, `${revision}` CI versioning — root `pom.xml` L15, L18-31, L38
- `dependencyManagement` centralizing internal modules — root `pom.xml` L64-90
- `common-lib` as nested multi-module aggregator — `common-lib/pom.xml`
- Service depending on `common-lib` submodules — `order-service/pom.xml` L16-18
- Parent inherits `spring-boot-starter-parent` — root `pom.xml` L6-9

## Microservices patterns
- Sync inter-service call via `RestClient` — `order-service/.../service/CallAPI.java` L16-31 (hardcoded service hostnames)
- Shared pooled `RestClient.Builder` + correlation-id propagation — `common-lib/common-spring/.../autoconfigure/RestClientAutoConfiguration.java` L44-56, L88-104
- Circuit breaker (Resilience4j) w/ fallback — `rating-service/.../service/OrderService.java` L22, L39-42
- Circuit-breaker fallback base class (template method) — `rating-service/.../service/AbstractCircuitBreakFallbackHandler.java` L8-24
- Kafka producer (async publish) — `payment-service/.../event/EventProducer.java` L17-26
- Kafka producer/consumer manual bean config — `payment-service/.../config/kafka/CommonConfiguration.java` L22-35
- CDC (Debezium-style) Kafka consumer template method — `common-lib/common-kafka/.../kafka/cdc/BaseCdcConsumer.java` L27-48
- Elasticsearch search-index microservice (`@Document`, custom analyzer) — `search-service/.../document/Product.java` L16-44, synced via `search-service/.../consumer/ProductSyncDataConsumer.java`
- Correlation ID tracing via MDC + servlet filter — `common-lib/common-spring/.../web/filter/CorrelationIdFilter.java` + `MdcKey.java`
- Object storage abstraction (presigned URLs) — `common-lib/common-storage/.../S3ObjectStorageService.java` L46-59, L156-177

## AOP / cross-cutting
- Custom `@Around` aspect — `common-lib/common-logging/.../logging/LoggerAspect.java` L45-68, L74-98
- Declarative `@LogPerformance` annotation — `common-lib/common-logging/.../LogPerformance.java`, used at `UserServiceImpl.java` L38

## Docker / deployment (lower priority — presence only)
- Minimal service Dockerfile — `auth-service/Dockerfile`
- Local infra via docker-compose (Postgres/Redis/Kafka, healthchecks) — `docker-compose.yml` L1-60+
- Per-service k8s manifests — `k8s/backend/*.yaml`
- ArgoCD GitOps application manifest — `k8s/argocd/application.yaml`

## Testing patterns
- JUnit5 + Mockito unit test (`@Mock`, `assertThrows`) — `auth-service/src/test/.../service/UserServiceImplTest.java` L27-43, L67
- Controller test via manual instantiation (no `@WebMvcTest` context) — `auth-service/src/test/.../controller/AuthControllerTest.java` L42-56
- `RoleServiceImplTest.java` alongside `UserServiceImplTest.java`
- Record-behavior unit test — `common-lib/common-core/src/test/.../viewmodel/PageResponseTest.java`
- CSV exporter unit test — `common-lib/common-spring/src/test/.../csv/CsvExporterTest.java`
- i18n resolution unit test — `common-lib/common-core/src/test/.../i18n/MessagesTest.java`
- **Gap, don't paper over it**: testing is concentrated in auth-service + common-lib only; order/product/payment-service have no `src/test` at all.

## Explicit non-findings (say so in the book, don't invent chapters)
- No `@FeignClient` anywhere — inter-service calls are all `RestClient`.
- No Spring Cloud Gateway — root pom notes migration to Apache APISIX.
- `EventConsumer` in payment-service/notification-service is mostly commented-out dead code — usable as a "half-finished feature" example, not a clean concept demo.
- No `@WebMvcTest`/`@SpringBootTest`/Testcontainers found despite `rest-assured`/`instancio-junit` being pinned in the root pom — dependencies present but not exercised; verify before citing as "testing patterns used."
