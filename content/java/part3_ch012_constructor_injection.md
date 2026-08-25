## 12. Constructor Injection

### 12.1 The Concept

Dependency injection means a class doesn't create the objects it depends on —
it *receives* them from outside, usually through its constructor. Spring
builds every bean's dependencies first, then hands them in, rather than a
class reaching out and constructing (or looking up) its own collaborators.
Python code with a similar shape usually does this by hand, passing
dependencies as constructor arguments in whatever wiring code assembles the
application (`UserService(repo=PostgresUserRepo())`) — Spring's contribution is
doing that wiring automatically, for every bean, based on constructor
parameter types.

You've already seen the *result* of this pattern throughout this book —
`private final ProductRepository productRepository;` fields, assigned in a
constructor — without yet seeing how the constructor itself gets written.
This chapter looks at both ways it's done in this codebase.

### 12.2 In This Codebase: Lombok-Generated Constructors

Every service class in this book so far — `UserServiceImpl` (Part I §4.3),
`ProductServiceImpl` (Part I §4.2) — uses the same two-annotation shape:

```java
@RequiredArgsConstructor
@Service
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    // ...
}
```

`@RequiredArgsConstructor` is a Lombok annotation that generates a constructor
taking exactly the class's `final` fields as parameters, in declaration order
— for this class, a one-argument constructor,
`ProductServiceImpl(ProductRepository productRepository)`, that assigns the
parameter straight to the field. You never see that constructor's source
because Lombok generates it at compile time; the `final` keyword is what tells
Lombok (and, separately, the Java compiler) that this field must be set
exactly once, which is exactly what a constructor parameter provides.

Spring sees a class with exactly one constructor and calls it automatically,
supplying `ProductRepository` from its own registry of beans — no
`@Autowired` annotation needed on the constructor itself (that annotation is
only required when a class has *multiple* constructors and Spring needs to be
told which one to use for injection).

### 12.3 In This Codebase: Writing the Constructor by Hand

`S3ObjectStorageService`, in `common-lib`, does exactly the same thing without
Lombok — spelling out what `@RequiredArgsConstructor` would have generated:

```java
public class S3ObjectStorageService implements ObjectStorageService {

    private static final Logger log = LoggerFactory.getLogger(S3ObjectStorageService.class);

    private final S3Client s3Client;
    private final S3Presigner presigner;
    private final StorageProperties properties;

    public S3ObjectStorageService(S3Client s3Client, S3Presigner presigner, StorageProperties properties) {
        this.s3Client = s3Client;
        this.presigner = presigner;
        this.properties = properties;
    }

    // ...
}
```

**Source:** `common-lib/common-storage/src/main/java/com/ecommerce/commonlib/storage/S3ObjectStorageService.java`

Notice this class has **no** `@Service`, `@Component`, or any stereotype
annotation at all — because, unlike `ProductServiceImpl`, it isn't found by
component scanning. It's constructed explicitly as a `@Bean` inside a
`@Configuration` class elsewhere in `common-storage` (the same `@Bean` pattern
covered in the next chapter, §13.3), which is a second, equally valid way to
register something as a Spring-managed bean: either let component scanning
find an annotated class, or explicitly construct and return one from a
`@Bean` method. Both end up as beans Spring can inject elsewhere.

The constructor body itself — `this.s3Client = s3Client;` for each field — is
exactly what `@RequiredArgsConstructor` generates behind the scenes on every
other class in this book. Seeing it written out once makes clear that
Lombok's annotation isn't adding new capability, only removing repetition.

### 12.4 Why Constructor Injection, Specifically

Spring supports two other injection styles you'll see mentioned in older Java
tutorials — field injection (`@Autowired` directly on a field, skipping the
constructor entirely) and setter injection (`@Autowired` on a setter method).
Neither appears anywhere in this codebase. Constructor injection has two
concrete advantages over both, visible directly from the code you've already
read: a `final` field *cannot* be reassigned after construction, so once a
`ProductServiceImpl` exists, its `productRepository` is guaranteed non-null
and immutable for the object's entire lifetime — and a class that's hard to
construct (needs six constructor arguments) is immediately, visibly hard to
construct, which is a natural pressure against a service class silently
growing too many responsibilities over time.

### 12.5 Try It

`S3ObjectStorageService` takes three constructor parameters:
`S3Client`, `S3Presigner`, `StorageProperties`. If a fourth dependency were
added by hand-editing the constructor to accept a `MetricsRecorder` but the
constructor body was never updated to assign it to a field, would the code
even compile? Reason about what `final` (§12.2) actually requires the
compiler to verify.

---
