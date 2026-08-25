## 32. How This Repo Is Actually Built

### 32.1 The Concept

Maven is Java's build tool and dependency manager — roughly, the combined job
of `pip`, `poetry`/`pyproject.toml`, and a task runner in the Python world,
all driven by one XML file per module, `pom.xml` ("Project Object Model"). A
**multi-module** Maven project — this repo — has one root `pom.xml` that
doesn't build any code itself, just coordinates a tree of child modules that
each build something real, while centralizing version numbers so fourteen
services don't each pin their own, potentially drifting, copy of every
dependency version.

### 32.2 The Root: Aggregator and Version Pin

```xml
<project>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.5</version>
    </parent>
    <groupId>com.ecommerce.microservices</groupId>
    <artifactId>ecommerce-microservices</artifactId>
    <version>${revision}</version>
    <packaging>pom</packaging>

    <modules>
        <module>common-lib</module>
        <module>auth-service</module>
        <module>product-service</module>
        <module>order-service</module>
        <module>payment-service</module>
        <module>inventory-service</module>
        <module>shipping-service</module>
        <module>notification-service</module>
        <module>rating-service</module>
        <module>search-service</module>
        <module>promotion-service</module>
        <module>tax-service</module>
        <module>favourite-service</module>
        <module>media-service</module>
    </modules>

    <properties>
        <java.version>21</java.version>
        <revision>1.0-SNAPSHOT</revision>
        <lombok.version>1.18.34</lombok.version>
        <mapstruct.version>1.5.5.Final</mapstruct.version>
        <resilience4j.version>2.2.0</resilience4j.version>
        <modelmapper.version>3.2.0</modelmapper.version>
        <!-- removed: spring-cloud (gateway migrated to Apache APISIX) -->
        <elasticsearch.version>8.15.1</elasticsearch.version>
        <aws-sdk.version>2.31.6</aws-sdk.version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>com.ecommerce.microservices</groupId>
                <artifactId>common-spring</artifactId>
                <version>${revision}</version>
            </dependency>
            <dependency>
                <groupId>com.ecommerce.microservices</groupId>
                <artifactId>common-security</artifactId>
                <version>${revision}</version>
            </dependency>
            <!-- ... common-core, common-storage, common-logging, common-keycloak, common-kafka ... -->
            <dependency>
                <groupId>org.projectlombok</groupId>
                <artifactId>lombok</artifactId>
                <version>${lombok.version}</version>
            </dependency>
            <dependency>
                <groupId>org.mapstruct</groupId>
                <artifactId>mapstruct</artifactId>
                <version>${mapstruct.version}</version>
            </dependency>
            <!-- ... springdoc, resilience4j, modelmapper, elasticsearch, and more ... -->
        </dependencies>
    </dependencyManagement>
</project>
```

**Source:** `pom.xml` (repo root; trimmed — the real file also configures the compiler, Lombok/MapStruct annotation processors, Jacoco coverage, an OWASP dependency-check plugin, and a Jib container-image plugin)

`<packaging>pom</packaging>` is the signal that this file builds nothing
itself — it's pure coordination. `<parent>spring-boot-starter-parent</parent>`
is Spring Boot's own convention-setting parent POM (the reason a Spring Boot
project rarely needs to specify individual Spring library versions — the
parent already pins a tested, compatible set). `${revision}` appears as the
version for the project itself *and* for every internal `common-lib`
submodule dependency — a single property, defined once, that every module
inherits, so bumping the whole platform's version is a one-line change here
rather than fourteen-plus separate edits.

`<dependencyManagement>` is the mechanism worth understanding precisely: it
**declares** a version for a dependency without actually adding that
dependency to any module's classpath. A child module still has to list
`lombok` in its own `<dependencies>` to use it — but once it does, without
specifying a version, Maven resolves it to whatever version this root POM
declared. This is what keeps all fourteen services on the *exact same* Lombok,
MapStruct, and internal `common-lib` versions without each service repeating
(and potentially drifting on) that version number.

### 32.3 A Nested Aggregator: `common-lib`

`common-lib` is itself simultaneously a *child* of the root and a *parent* of
its own seven submodules — the same aggregator pattern, one level deeper:

```xml
<project>
    <parent>
        <groupId>com.ecommerce.microservices</groupId>
        <artifactId>ecommerce-microservices</artifactId>
        <version>${revision}</version>
        <relativePath>../pom.xml</relativePath>
    </parent>
    <artifactId>common-lib</artifactId>
    <packaging>pom</packaging>

    <modules>
        <module>common-core</module>
        <module>common-security</module>
        <module>common-logging</module>
        <module>common-keycloak</module>
        <module>common-kafka</module>
        <module>common-spring</module>
        <module>common-storage</module>
    </modules>
</project>
```

**Source:** `common-lib/pom.xml`

This is exactly why the book's citations throughout have been
`common-lib/common-core/...`, `common-lib/common-security/...`,
`common-lib/common-spring/...` — each is a genuinely separate Maven module
(and separate compiled `.jar`) with its own `pom.xml`, not just a folder
convention. `BusinessException` and `ErrorCode` (Part I) live in `common-core`
specifically because they have no framework dependencies of their own;
`BaseSecurityConfig` (Part VII §24) lives in `common-security` because it
needs Spring Security on its classpath — splitting into seven small modules
instead of one big `common-lib` lets a service depend on only the pieces it
actually needs.

### 32.4 A Service Consuming It

```xml
<project>
    <parent>
        <groupId>com.ecommerce.microservices</groupId>
        <artifactId>ecommerce-microservices</artifactId>
        <version>${revision}</version>
        <relativePath>../pom.xml</relativePath>
    </parent>
    <artifactId>order-service</artifactId>

    <dependencies>
        <dependency>
            <groupId>com.ecommerce.microservices</groupId>
            <artifactId>common-spring</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.liquibase</groupId>
            <artifactId>liquibase-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
    </dependencies>
</project>
```

**Source:** `order-service/pom.xml` (trimmed — ModelMapper, Lombok, and the test dependency follow)

Notice `common-spring` (and every other internal dependency) appears with
**no `<version>` tag at all** — this is `dependencyManagement` (§32.2) doing
its job: the root POM already declared that version once, and every consuming
module just asks for the artifact by name. `<scope>runtime</scope>` on the
Postgres driver is a small, precise statement: this service's own code never
directly imports anything from the Postgres driver (it goes through JPA/
Hibernate, Part V), so the driver only needs to be present on the classpath
*when the application actually runs*, not when this module's own code
compiles.

### 32.5 Try It

`common-spring` appears as a dependency in `order-service/pom.xml` with no
version. Using §32.2 and §32.3, trace exactly where that dependency's version
number is actually determined — name the specific file and the specific
property that ultimately resolves it.

---
