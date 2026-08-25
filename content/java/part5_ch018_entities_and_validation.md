## 18. Entities and Validation

### 18.1 The Concept

A JPA `@Entity` is a class whose instances map directly to rows in a database
table — the Java/Spring equivalent of a Django model or a SQLAlchemy declarative
class. Bean Validation (`@NotBlank`, `@Size`, `@Pattern`, `@Email` — the
`jakarta.validation.constraints` package) is a separate, composable concern
that happens to be usable on the exact same fields: the entity describes *how
data is stored*, the validation annotations describe *what data is allowed at
all*, and Java lets both live on the same class without conflict.

### 18.2 In This Codebase

`User` is the richest validated entity in the codebase — every field pairs a
persistence annotation with a validation constraint:

```java
package com.ecommerce.authservice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.NaturalId;

import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "users", uniqueConstraints = {
        @UniqueConstraint(name = "unique_username", columnNames = "user_name"),
        @UniqueConstraint(name = "unique_email", columnNames = "email"),
        @UniqueConstraint(name = "unique_phone", columnNames = "phone_number")
})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id", unique = true, nullable = false, updatable = false)
    private Long id;

    @NotBlank(message = "Full name must not be blank")
    @Size(min = 3, max = 100, message = "Full name must be between 3 and 100 characters")
    @Column(name = "full_name")
    private String fullName;

    @NotBlank(message = "Username must not be blank")
    @Size(min = 3, max = 100, message = "Username must be between 3 and 100 characters")
    @Column(name = "user_name")
    private String username;

    @NaturalId
    @NotBlank
    @Size(max = 50)
    @Email(message = "Input must be in Email format")
    @Column(name = "email")
    private String email;

    @NotBlank(message = "Gender must not be blank")
    @Column(name = "gender", nullable = false)
    private String gender;

    @Pattern(regexp = "^\\+84[0-9]{9,10}$|^0[0-9]{9,10}$", message = "The phone number is not in the correct format")
    @Size(min = 10, max = 11, message = "Phone number must be between 10 and 11 characters")
    @Column(name = "phone_number", unique = true)
    private String phone;

    @Pattern(regexp = "^(http|https)://.*$", message = "Avatar URL must be a valid HTTP or HTTPS URL")
    @Column(name = "image_url", columnDefinition = "TEXT")
    private String avatar;

    @Column(name = "keycloak_user_id", unique = true)
    private String keycloakUserId;

    @Builder.Default
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "user_role",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();
}
```

**Source:** `auth-service/src/main/java/com/ecommerce/authservice/entity/User.java`

`@Table(uniqueConstraints = {...})` declares database-level uniqueness — three
named constraints, enforced by Postgres itself regardless of what Java code
does. `@Pattern(regexp = "^\\+84...")` on `phone` is a real, specific-to-this-platform
rule (Vietnamese phone number formats, matching `spring.web.locale: vi_VN`
from Part II §8.2's `application.yml`) rather than a generic phone validator —
worth noticing as a reminder that validation constraints in a real codebase
often encode business/regional rules, not just generic type-safety.

`@NaturalId` on `email` reappears from Part I §1 — Hibernate's marker for a
business key distinct from the surrogate `@Id` primary key (`id`, an
auto-incrementing `Long`). The practical difference: `id` is what every
foreign key in this system points to and is meaningless outside the database;
`email` is meaningful to a human and to the business, uniquely identifies a
`User` just as validly, and Hibernate can look a `User` up by it through a
dedicated, more efficient natural-ID lookup API rather than a generic query.

`@Builder.Default` next to the `roles` field matters specifically because
`@Builder` (Lombok, generating a fluent builder API) would otherwise leave
`roles` as `null` for any `User` built without explicitly calling
`.roles(...)` — `@Builder.Default` tells Lombok's generated builder to fall
back to `new HashSet<>()` instead, avoiding a `NullPointerException` the first
time code tries to add a role to a freshly built user.

### 18.3 What Validation Actually Does (and Doesn't) Guarantee

These annotations do nothing by themselves — they're inert metadata until
something actually triggers validation. `@Valid` on a controller's
`@RequestBody` parameter (Part IV §14.2) is what triggers it for incoming API
requests; Part VIII §21 covers exactly what happens, and what response a
client receives, when a constraint like `@NotBlank` fails. Persisting a `User`
through JPA directly (bypassing a controller entirely, as `UserServiceImpl.register`
does after already validating the incoming `RegisterRequest`) does *not*
re-trigger these same annotations unless Hibernate's own Bean Validation
integration is separately configured to do so — worth knowing so you don't
assume an entity's annotations are a database-level safety net on every write
path, when here they're specifically wired to the one path that matters,
incoming HTTP requests.

### 18.4 Try It

`User.email` carries both `@NaturalId` and `@Column(name = "email")` — no
explicit `unique = true` on the `@Column` itself, unlike `phone` right below
it. Looking at the class-level `@Table(uniqueConstraints = ...)` block, find
where `email`'s uniqueness is actually enforced instead, and explain why the
same constraint expressed two different ways (a `@Column` attribute vs. a
table-level `@UniqueConstraint`) both end up producing the same guarantee at
the database level.

---
