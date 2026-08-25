## 7. Anatomy of a Spring Boot App

### 7.1 The Concept

A Spring Boot application starts from exactly one method: a `main` method that
calls `SpringApplication.run(...)`. Everything else — which classes become
beans, which configuration loads, which web server starts — is discovered
automatically by Spring's **component scanning**, not wired up by hand in that
`main` method the way you might manually construct and wire objects together
in a small Python script.

If you've used Flask or FastAPI, the closest mental model is the `app = Flask(__name__)` /
`app = FastAPI()` object those frameworks give you — except Spring Boot's
equivalent object is implicit. `@SpringBootApplication` on one class is the
signal that says "this is the root of the application; scan everything in and
below this package for components."

### 7.2 In This Codebase

`auth-service`'s entire entry point is four real lines of code:

```java
package com.ecommerce.authservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AuthServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(AuthServiceApplication.class, args);
	}

}
```

**Source:** `auth-service/src/main/java/com/ecommerce/authservice/AuthServiceApplication.java`

`@SpringBootApplication` is itself a shorthand for three separate annotations
stacked together — you don't need to memorize their internals yet, but it's
worth knowing the name hides real machinery, not magic:

- `@SpringBootConfiguration` — marks this class as a source of bean definitions (a specialization of `@Configuration`).
- `@EnableAutoConfiguration` — turns on Spring Boot's autoconfiguration mechanism, which is what makes adding `spring-boot-starter-web` to the build automatically give you an embedded web server with no manual setup. Part II §7.4 (Building Your Own Starter) shows what one piece of this actually looks like from the inside.
- `@ComponentScan` — scans this class's package, and every package beneath it, for `@Component`, `@Service`, `@Repository`, `@Controller`, and similar annotated classes, and registers them as beans automatically. This is why `AuthServiceApplication` sits at `com.ecommerce.authservice` — everything else in this book that lives under that package (`UserServiceImpl`, `AuthController`, ...) gets found by this scan without being registered anywhere by hand.

`SpringApplication.run(AuthServiceApplication.class, args)` is what actually
boots the application: it builds the Spring container (called the
**ApplicationContext**), runs autoconfiguration, starts the embedded web
server (Tomcat, by default), and — as you'll see in §7.5 — runs any
`CommandLineRunner` beans it finds, like `inventory-service`'s `DataLoader`.

### 7.3 Try It

Every one of the fourteen services in this codebase (`product-service`,
`order-service`, and so on) has its own near-identical `*Application.java`
file with the exact same four-line shape as `AuthServiceApplication` above,
just a different class name. In your own words, explain why a *microservices*
architecture needs fourteen separate `main` methods and fourteen separate
`@SpringBootApplication` classes, where a single monolithic application would
need only one.

---
