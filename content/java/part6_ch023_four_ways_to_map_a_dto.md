## 23. Four Ways to Map a DTO in One Codebase

### 23.1 The Concept

"Copy fields from an entity to a DTO, and back" is one of the most repeated
tasks in any layered backend, Python or Java — and this codebase, across its
fourteen services, genuinely uses four different strategies for it, three of
which you've already met individually in earlier chapters. Reading all four
side by side, deliberately, makes the tradeoffs concrete instead of abstract:
how much boilerplate each needs, when each was written, and what each
actually costs at runtime.

### 23.2 Strategy 1: Fully Manual

`ProductMappingHelper` (Part I §6.2) hand-writes every field assignment,
using a static interface method:

```java
public interface ProductMappingHelper {
    static ProductDto map(final Product product) {
        return ProductDto.builder()
                .productId(product.getProductId())
                .productTitle(product.getProductTitle())
                .imageUrl(product.getImageUrl())
                // ... every field, by hand ...
                .build();
    }
}
```

**Cost:** maximum boilerplate — every field, both directions, written and
maintained by hand. **Benefit:** zero magic. Nothing to configure, nothing
that breaks in a way you can't read directly in the stack trace; a new
engineer can understand the entire mapping by reading it top to bottom, no
generated code or reflection involved.

### 23.3 Strategy 2: `BeanUtils.copyProperties`

`ProductServiceImpl.update` (Part I §4.2) uses Spring's own reflection-based
bulk copy instead of naming every field:

```java
BeanUtils.copyProperties(productDto, existingProduct, "productId", "categoryDto");
```

**Cost:** works by matching getter/setter names via reflection at runtime —
silently does nothing for a field whose name or type doesn't match between
source and target, which can hide a bug rather than surface one (there's no
compile-time check that every field was actually copied). **Benefit:**
one line, no per-field code at all, and the trailing string arguments
(`"productId"`, `"categoryDto"`) give a simple, readable exclusion list for
fields that need special handling instead of a blanket copy.

### 23.4 Strategy 3: ModelMapper

`UserMapper` wraps a `ModelMapper` bean rather than assigning fields by hand
*or* relying on a static reflection call:

```java
package com.ecommerce.authservice.mapper;

import com.ecommerce.authservice.dto.request.RegisterRequest;
import com.ecommerce.authservice.dto.response.UserResponse;
import com.ecommerce.authservice.entity.User;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    private final ModelMapper modelMapper;

    public UserMapper(ModelMapper modelMapper) {
        this.modelMapper = modelMapper;
    }

    public UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullname(user.getFullName())
                .username(user.getUsername())
                .email(user.getEmail())
                .gender(user.getGender())
                .phone(user.getPhone())
                .avatar(user.getAvatar())
                .build();
    }

    public User toEntity(RegisterRequest request) {
        return modelMapper.map(request, User.class);
    }

    public void mergeToEntity(RegisterRequest source, User target) {
        modelMapper.map(source, target);
    }
}
```

**Source:** `auth-service/src/main/java/com/ecommerce/authservice/mapper/UserMapper.java`

This is genuinely a hybrid, not a pure strategy — `toResponse` maps by hand
(builder, field by field, same style as Strategy 1), while `toEntity` and
`mergeToEntity` delegate to `modelMapper.map(...)`, a library that inspects
both classes via reflection at runtime and matches fields by name/type
automatically, with configurable rules for anything that doesn't match
directly. `UserMapper` is itself constructor-injected (§12.3's explicit,
non-Lombok constructor style) with a `ModelMapper` bean — meaning `ModelMapper`
itself is registered as a `@Bean` somewhere else in `auth-service`, the same
`@Bean`-inside-`@Configuration` pattern from §13.3, just for a third-party
library class this codebase doesn't own.

**Cost:** a runtime dependency and a small amount of "how did it map that
field?" opacity when something doesn't match the way you'd expect — debugging
a ModelMapper mismatch means understanding its matching strategy, not just
reading your own code. **Benefit:** genuinely less code than Strategy 1 for
classes with many matching field names, while still being flexible enough
(as `toResponse` shows) to drop back to manual mapping for the one method
where hand control is worth it.

### 23.5 Strategy 4: MapStruct (Compile-Time Generated)

Part I §2.2 already introduced `BaseMapper<M, V>`, the shared contract; here's
where it's actually implemented:

```java
package com.ecommerce.media.mapper;

import com.ecommerce.media.model.Media;
import com.ecommerce.media.viewmodel.MediaVm;
import com.ecommerce.commonlib.mapper.BaseMapper;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface MediaVmMapper extends BaseMapper<Media, MediaVm> {
}
```

**Source:** `media-service/src/main/java/com/ecommerce/media/mapper/MediaVmMapper.java`

This interface's body is empty — genuinely nothing, not even a static method.
`@Mapper(componentModel = "spring")` tells the MapStruct annotation processor
to **generate a real implementing class at compile time** (a
`MediaVmMapperImpl.java` you'd find in the build output, not hand-written by
anyone), registered as a Spring bean (`componentModel = "spring"`) — and that
generated class contains plain, ordinary field-assignment code, not
reflection. `BaseMapper<Media, MediaVm>` supplies the method signatures
(`toModel`, `toVm`, `partialUpdate`) MapStruct implements automatically by
matching field names between `Media` and `MediaVm`.

**Cost:** the least visible strategy of the four — the actual mapping code
doesn't exist anywhere you'd normally look, since it's generated during the
build. Debugging requires knowing to go find the generated `*Impl` class.
**Benefit:** the best of both other worlds — zero hand-written mapping code
(like ModelMapper), but the generated code is plain, fast, ordinary Java (no
reflection at runtime, unlike ModelMapper or `BeanUtils`), and a field-name
mismatch MapStruct can't resolve is a **compile-time error**, not a silently
skipped field discovered in production.

### 23.6 Reading the Codebase With This in Mind

None of these four strategies is "the framework's answer" — they coexist
because different services were written at different times, by developers
making a reasonable call for their situation. Recognizing which one a given
file uses, the moment you see `BeanUtils.copyProperties`, a `static` helper
method, a `ModelMapper` field, or an empty `@Mapper` interface, tells you
immediately how much to trust "it just works" versus how much you'd need to
step through a debugger to see what actually happened on a given field.

### 23.7 Try It

If `MediaVmMapper` (§23.5) is ever asked to map a `Media` field that has no
matching field name on `MediaVm` at all, what happens — a runtime exception
the first time it's called, a silently-skipped field, or something that stops
the project from building in the first place? Base your answer on where each
of the four strategies in this chapter actually does its field-matching work:
at runtime via reflection, or at compile time.

---
