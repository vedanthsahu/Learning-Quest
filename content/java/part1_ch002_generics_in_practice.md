## 2. Generics in Practice

### 2.1 The Concept

Java generics let a class or interface be written once and parameterized by
type: `List<String>` and `List<Integer>` are both the same `List` code, just
instantiated for different element types. Python doesn't need this the same
way — a Python `list` will happily hold anything, and type hints like
`list[str]` are optional and unchecked at runtime. In Java, `List<String>` is
enforced by the compiler: trying to add an `Integer` to it is a compile error,
not a runtime surprise three function calls later.

The type parameter itself is just a placeholder name in angle brackets —
conventionally a single letter (`T` for "type", `M`/`V` when a class needs two
distinct type slots, as below).

### 2.2 In This Codebase: Two Type Parameters

`BaseMapper<M, V>` takes one step beyond a single-type-parameter class like
`ApiResponse<T>` (Part I §1) — it has two parameters at once, one for the
entity type, one for the view-model type, because a mapper always needs both
named simultaneously:

```java
package com.ecommerce.commonlib.mapper;

import org.mapstruct.BeanMapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

/**
 * Shared MapStruct contract for two-way model ↔ view-model mapping.
 *
 * @param <M> the entity (model) type
 * @param <V> the view-model type
 */
public interface BaseMapper<M, V> {

    M toModel(V vm);

    V toVm(M model);

    /**
     * Apply non-null fields from {@code vm} onto {@code model}. Null fields are skipped
     * to support HTTP PATCH semantics.
     */
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void partialUpdate(@MappingTarget M model, V vm);
}
```

**Source:** `common-lib/common-spring/src/main/java/com/ecommerce/commonlib/mapper/BaseMapper.java`

Any concrete mapper (e.g. a future `UserMapper implements BaseMapper<User, UserResponse>`)
fixes `M` = `User` and `V` = `UserResponse` for every method in the interface at
once — you don't repeat the types on each method.

Notice `partialUpdate` doesn't *return* anything — it takes `model` (annotated
`@MappingTarget`) and mutates it in place, copying only the non-null fields from
`vm` onto it. That's the generic-interface version of a PATCH endpoint's
semantics: "update only what was actually sent." (MapStruct, the library that
implements this interface at compile time, is covered properly in Part VI.)

### 2.3 Bounded Wildcards

`PageResponse<T>`'s `map` method is the more advanced generics example in this
codebase — it remaps every element of a page from type `T` to a different type
`R`, while keeping the pagination metadata (page number, total count, etc.)
untouched. Here's the complete file:

```java
package com.ecommerce.commonlib.viewmodel;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;
import java.util.function.Function;

/**
 * Lightweight page envelope used for paginated endpoints. Decouples the wire format
 * from Spring Data's {@code Page} (which is not designed to be serialized directly).
 *
 * <h3>Why not return Spring {@code Page<T>} directly?</h3>
 * The {@code Page<T>} JSON shape changed between Spring Boot 2 and 3 (now wrapped in
 * {@code PageImpl}) and is officially flagged as unstable. This record pins the shape
 * the platform exposes externally.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last
) {

    public static <T> PageResponse<T> of(List<T> content,
                                         int page,
                                         int size,
                                         long totalElements) {
        int totalPages = size == 0 ? 0 : (int) Math.ceil((double) totalElements / size);
        return new PageResponse<>(
                content,
                page,
                size,
                totalElements,
                totalPages,
                page == 0,
                page + 1 >= totalPages
        );
    }

    /**
     * Map the content elements while keeping pagination metadata intact.
     * Avoid building a Spring {@code Page} on the caller side just to remap.
     */
    public <R> PageResponse<R> map(Function<? super T, ? extends R> mapper) {
        List<R> mapped = content.stream().<R>map(mapper).toList();
        return new PageResponse<>(mapped, page, size, totalElements, totalPages, first, last);
    }
}
```

**Source:** `common-lib/common-core/src/main/java/com/ecommerce/commonlib/viewmodel/PageResponse.java`

`Function<? super T, ? extends R>` looks intimidating but reads as two separate,
sensible relaxations of a stricter `Function<T, R>`:

- **`? super T`** — the mapper is allowed to accept anything that's a
  *supertype* of `T`, not only `T` exactly. If you have a `PageResponse<Product>`,
  a function that accepts any general `Object` still works to map it.
- **`? extends R`** — the mapper is allowed to return anything that's a
  *subtype* of `R`. If you asked for `PageResponse<Dto>`, a function returning a
  more specific `ProductDto` still satisfies that.

This is the standard Java rule nicknamed **PECS** — *Producer Extends, Consumer
Super* — and this one method is a genuine, real (not textbook-invented) example
of it: the mapper *consumes* `T`-like values (hence `super`) and *produces*
`R`-like values (hence `extends`).

`of(...)` is worth a second look too: it computes `totalPages`, `first`, and
`last` from the raw inputs so callers never have to derive that arithmetic
themselves — the record's canonical constructor is deliberately not the main
way this type gets built.

### 2.4 Try It

Look at `PageResponse<T>` above. `PageResponse<T>` is itself generic over `T`,
and `map` introduces a *second*, independent type parameter `<R>` on the method
itself. Find both declarations and identify: which one is fixed for the
lifetime of a given `PageResponse` instance, and which one is chosen fresh, per
call, every time `map` is invoked?

---
