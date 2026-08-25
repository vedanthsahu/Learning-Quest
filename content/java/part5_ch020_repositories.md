## 20. Repositories: Marker Interfaces to Derived Queries to Custom JPQL

### 20.1 The Concept

Spring Data JPA's central trick: you write an *interface*, extend one of
Spring Data's own base interfaces, and a working implementation is generated
for you at startup — no SQL, often no method body at all. This codebase shows
the whole spectrum, from a repository that adds nothing at all, to one that
adds only method *signatures* Spring parses into queries automatically, to
one that hand-writes a query.

### 20.2 The Empty Marker Interface

```java
package com.ecommerce.productservice.repository;

import com.ecommerce.productservice.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Integer> {
}
```

**Source:** `product-service/src/main/java/com/ecommerce/productservice/repository/ProductRepository.java`

This interface's body is empty, and it doesn't need anything more —
`JpaRepository<Product, Integer>` (entity type, primary-key type) already
provides `findAll()`, `findById(Integer)`, `save(Product)`, `delete(Product)`,
and dozens more, all through inheritance from Spring Data's own interfaces.
Every call to `productRepository.findAll()` you've already seen (Part I §4.2)
is calling a method this interface never wrote — Spring generated a real
implementing class at startup and registered it as a bean, all from this one
declaration.

### 20.3 Derived Query Methods

`UserRepository` adds methods beyond the inherited ones — but still no method
*bodies*, only signatures Spring Data parses to build queries automatically:

```java
package com.ecommerce.authservice.repository;

import com.ecommerce.authservice.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);
}
```

**Source:** `auth-service/src/main/java/com/ecommerce/authservice/repository/UserRepository.java`

Spring Data parses each method's *name* into a query — `findByUsername`
becomes `SELECT u FROM User u WHERE u.username = ?1`, `existsByEmail` becomes
an `EXISTS`-style check against the `email` column — purely from the method
name matching the entity's field names, following a documented naming
convention (`findBy`/`existsBy` + field name, optionally chained with `And`/`Or`).
`Optional<User>` as the return type for the `findBy...` methods is exactly
the contract Part I §4.3 already covered — the signature itself documents
that "not found" is an expected outcome. Every one of these methods is what
Part I §4.3 and Part I §5.4's `.orElseThrow(...)` calls, and Part III's
`existsByUsername`/`existsByEmail`/`existsByPhoneNumber` wrapper methods in
`UserServiceImpl` (Part I §4.3), are actually calling underneath.

The class-level `@Repository` annotation (Part III §13.1) is what enables
Spring's translation of low-level database exceptions (a raw JDBC
`SQLException`, say) into its own consistent `DataAccessException` hierarchy —
worth naming explicitly here since this is one of the only repositories in
the book that actually carries the annotation (`ProductRepository`, §20.2,
doesn't — Spring Data still registers it as a bean and it still works
identically, since `@Repository` is a convenience here, not a strict
requirement for a `JpaRepository` subtype specifically).

### 20.4 Hand-Written JPQL

When a derived method name can't express what's needed, `@Query` lets you
write JPQL (an SQL-like query language operating on entity fields and
associations, not raw table/column names) directly:

```java
package com.ecommerce.productservice.repository;

import com.ecommerce.productservice.entity.Category;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.PagingAndSortingRepository;

public interface CategoryRepositoryPagingAndSorting extends PagingAndSortingRepository<Category, Integer> {

    @Query("SELECT c FROM Category c")
    Page<Category> findAllPagedAndSortedCategories(Pageable pageable);

}
```

**Source:** `product-service/src/main/java/com/ecommerce/productservice/repository/CategoryRepositoryPagingAndSorting.java`

Two things worth noticing together. First, `PagingAndSortingRepository` (not
`JpaRepository`) — a narrower Spring Data interface offering only paging and
sorting operations, without the full CRUD surface `JpaRepository` provides;
choosing it is a small, explicit statement of "this repository's job is
reading pages of data," even though in practice `JpaRepository` extends it and
could always have been used instead. Second, the query itself,
`SELECT c FROM Category c` — this looks almost pointless (it's equivalent to
the inherited `findAll(Pageable)`), but accepting a `Pageable` parameter on a
custom `@Query` method is exactly how you'd extend this same pattern to add
real filtering (`WHERE c.categoryTitle LIKE ...`) while keeping pagination,
which a purely derived method name can't always express cleanly.

### 20.5 Try It

`ProductRepository` (§20.2) has no method for "find all products in a given
category." Using the derived-query-method naming convention demonstrated by
`UserRepository` (§20.3) — and knowing from Part I §6.3 that `Product` has a
`category` field of type `Category` — write the method signature you'd add to
`ProductRepository` to find all products belonging to a given category ID,
without writing any `@Query` at all.

---
