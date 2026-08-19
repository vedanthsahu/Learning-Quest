## 4. Streams & Optional

### 4.1 The Concept

A Java `Stream` is the rough equivalent of a Python generator expression chained
through `map`/`filter`: a pipeline of operations over a sequence, built lazily
and only actually run when a terminal operation (`.toList()`, `.collect(...)`,
`.forEach(...)`) is called. Where Python would write:

```python
titles = [p.title for p in products if p.active]
```

Java's stream equivalent chains named methods instead of using comprehension
syntax:

```java
List<String> titles = products.stream()
        .filter(Product::isActive)
        .map(Product::getTitle)
        .toList();
```

`Optional<T>` is Java's explicit "this might not have a value" wrapper type —
the closest Python parallel is a function that returns `None` instead of
raising, except `Optional` forces the caller to explicitly unwrap it
(`.get()`, `.orElseThrow()`, `.orElse(default)`) rather than letting a stray
`None` silently propagate until it crashes somewhere unrelated.

### 4.2 In This Codebase: A Stream Pipeline

`ProductServiceImpl` is a good file to read in full here — it shows a stream
pipeline (`findAll`) and two `Optional`-based lookups (`findById`, and the
lookups inside `update`) side by side, all in one real class:

```java
package com.ecommerce.productservice.service.impl;

import com.ecommerce.productservice.dto.ProductDto;
import com.ecommerce.productservice.entity.Product;
import com.ecommerce.productservice.exception.wrapper.ProductNotFoundException;
import com.ecommerce.productservice.helper.CategoryMappingHelper;
import com.ecommerce.productservice.helper.ProductMappingHelper;
import com.ecommerce.productservice.repository.ProductRepository;
import com.ecommerce.productservice.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;

@RequiredArgsConstructor
@Service
public class ProductServiceImpl implements ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductServiceImpl.class);

    private final ProductRepository productRepository;

    @Override
    public List<ProductDto> findAll() {
        log.info("ProductDto List, service; fetch all products");
        return productRepository.findAll()
                .stream()
                .map(ProductMappingHelper::map)
                .distinct()
                .toList();
    }

    @Override
    public ProductDto findById(Integer productId) {
        log.info("ProductDto, service; fetch product by id");
        return productRepository.findById(productId)
                .map(ProductMappingHelper::map)
                .orElseThrow(() -> new ProductNotFoundException(String.format("Product with id[%d] not found", productId)));
    }

    @Override
    public ProductDto save(ProductDto productDto) {
        log.info("ProductDto, service; save product");
        try {
            return ProductMappingHelper.map(productRepository.save(ProductMappingHelper.map(productDto)));
        } catch (DataIntegrityViolationException e) {
            log.error("Error saving product: Data integrity violation", e);
            throw new ProductNotFoundException("Error saving product: Data integrity violation", e);
        } catch (Exception e) {
            log.error("Error saving product", e);
            throw new ProductNotFoundException("Error saving product", e);
        }
    }

    @Override
    public ProductDto update(ProductDto productDto) {
        log.info("ProductDto, service; update product");
        Product existingProduct = productRepository.findById(productDto.getProductId())
                .orElseThrow(() -> new ProductNotFoundException("Product not found with id: " + productDto.getProductId()));
        BeanUtils.copyProperties(productDto, existingProduct, "productId", "categoryDto");
        if (productDto.getCategoryDto() != null) {
            existingProduct.setCategory(CategoryMappingHelper.map(productDto.getCategoryDto()));
        }
        return ProductMappingHelper.map(productRepository.save(existingProduct));
    }

    @Override
    public ProductDto update(Integer productId, ProductDto productDto) {
        log.info("ProductDto, service; update product with productId");
        Product existingProduct = productRepository.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException("Product not found with id: " + productId));
        BeanUtils.copyProperties(productDto, existingProduct, "productId", "category");
        if (productDto.getCategoryDto() != null) {
            existingProduct.setCategory(CategoryMappingHelper.map(productDto.getCategoryDto()));
        }
        return ProductMappingHelper.map(productRepository.save(existingProduct));
    }

    @Override
    public void deleteById(Integer productId) {
        log.info("Void, service; delete product by id");
        productRepository.delete(ProductMappingHelper.map(findById(productId)));
    }
}
```

**Source:** `product-service/src/main/java/com/ecommerce/productservice/service/impl/ProductServiceImpl.java`

Two things worth reading closely:

**`findAll()`** — fetch every product, map each JPA entity to its DTO, drop
duplicates, materialize as a `List`. `ProductMappingHelper::map` (a **method
reference** — shorthand for `product -> ProductMappingHelper.map(product)`,
covered as a mapping strategy in Part VI) is passed directly as the mapping
function. `.distinct()` relies on the DTO's generated `equals()`/`hashCode()`
to decide what counts as a duplicate. `.toList()` is the terminal operation —
nothing above it actually runs against the database until this line executes.

**`findById(Integer productId)`** — chains `Optional.map(...)` *before*
`.orElseThrow(...)`: if the product exists, transform it to a DTO inside the
`Optional`; only if it's still empty after that does the exception fire. This
is a subtly different, more compact shape than the plain `.orElseThrow(...)`
pattern in §4.3 below — the transform and the not-found handling are both
expressed in one fluent chain instead of an `if` statement.

### 4.3 In This Codebase: Optional as a Contract

`UserServiceImpl` uses `Optional` the way it's meant to be used — as a signal
that "not found" is an expected, handled outcome, not an exceptional crash.
Here's the complete file:

```java
package com.ecommerce.authservice.service;

import com.ecommerce.authservice.dto.request.ChangePasswordRequest;
import com.ecommerce.authservice.dto.request.RegisterRequest;
import com.ecommerce.authservice.dto.request.UpdateUserRequest;
import com.ecommerce.authservice.dto.response.UserResponse;
import com.ecommerce.authservice.entity.RoleName;
import com.ecommerce.authservice.entity.User;
import com.ecommerce.authservice.mapper.RoleMapper;
import com.ecommerce.authservice.mapper.UserMapper;
import com.ecommerce.authservice.repository.UserRepository;
import com.ecommerce.commonlib.exception.BusinessException;
import com.ecommerce.commonlib.keycloak.KeycloakAuthClient;
import com.ecommerce.commonlib.logging.LogPerformance;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final RoleService roleService;
    private final KeycloakAuthClient keycloakAuthClient;

    @Override
    @Transactional
    @LogPerformance(title = "register user", logInput = true)
    public User register(RegisterRequest request) {
        if (existsByUsername(request.getUsername())) {
            throw BusinessException.conflict("auth.username.exists", request.getUsername());
        }
        if (existsByEmail(request.getEmail())) {
            throw BusinessException.conflict("auth.email.exists", request.getEmail());
        }
        if (existsByPhoneNumber(request.getPhone())) {
            throw BusinessException.conflict("auth.phone.exists", request.getPhone());
        }

        List<String> requestedRoles = normalizeRequestedRoles(request.getRoles());
        String keycloakUserId = keycloakAuthClient.createUser(
                request.getUsername(),
                request.getEmail(),
                request.getFullName(),
                request.getPassword(),
                requestedRoles
        );

        try {
            User user = userMapper.toEntity(request);
            user.setKeycloakUserId(keycloakUserId);
            user.setRoles(requestedRoles.stream()
                    .map(RoleMapper::toRoleName)
                    .map(roleName -> roleService.findByName(roleName)
                            .orElseThrow(() -> BusinessException.notFound("auth.role.not.found.in.database", roleName)))
                    .collect(Collectors.toSet()));

            return userRepository.save(user);
        } catch (RuntimeException ex) {
            keycloakAuthClient.deleteUser(keycloakUserId);
            throw ex;
        }
    }

    @Transactional
    @Override
    public UserResponse update(Long id, UpdateUserRequest request) {
        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> BusinessException.notFound("auth.user.not.found.for.update", id));

        if (request.getFullName() != null) existingUser.setFullName(request.getFullName());
        if (request.getEmail() != null) existingUser.setEmail(request.getEmail());
        if (request.getGender() != null) existingUser.setGender(request.getGender());
        if (request.getPhone() != null) existingUser.setPhone(request.getPhone());
        if (request.getAvatar() != null) existingUser.setAvatar(request.getAvatar());

        User saved = userRepository.save(existingUser);
        return userMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public String changePassword(ChangePasswordRequest request) {
        throw BusinessException.badRequest("auth.password.managed.by.keycloak");
    }

    @Transactional
    @Override
    public String delete(Long id) {
        userRepository.findById(id)
                .ifPresentOrElse(
                        user -> {
                            try {
                                userRepository.delete(user);
                            } catch (DataAccessException e) {
                                throw new RuntimeException("Error deleting user with userId: " + id, e);
                            }
                        },
                        () -> BusinessException.notFound("auth.user.not.found.for.user.id", id)
                );
        return "User with id " + id + " deleted successfully.";
    }

    @Override
    public User findById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> BusinessException.notFound("auth.user.not.found.with.user.id", userId));
    }

    @Override
    public User findByUsername(String userName) {
        return userRepository.findByUsername(userName)
                .orElseThrow(() -> BusinessException.notFound("auth.user.not.found.with.username", userName));
    }

    @Override
    @LogPerformance(title = "list users")
    public Page<UserResponse> findAllUsers(int page, int size, String sortBy, String sortOrder) {
        Sort sort = Sort.by(Sort.Direction.fromString(sortOrder), sortBy);
        PageRequest pageRequest = PageRequest.of(page, size, sort);
        Page<User> usersPage = userRepository.findAll(pageRequest);
        return usersPage.map(userMapper::toResponse);
    }

    private List<String> normalizeRequestedRoles(Set<String> roles) {
        if (roles == null || roles.isEmpty()) {
            return List.of("USER");
        }
        return roles.stream().map(String::trim).filter(value -> !value.isBlank()).toList();
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    public boolean existsByPhoneNumber(String phone) {
        return userRepository.existsByPhone(phone);
    }
}
```

**Source:** `auth-service/src/main/java/com/ecommerce/authservice/service/UserServiceImpl.java`

`findByUsername` is the cleanest single example in the file:

```java
public User findByUsername(String userName) {
    return userRepository.findByUsername(userName)
            .orElseThrow(() -> BusinessException.notFound("auth.user.not.found.with.username", userName));
}
```

`userRepository.findByUsername(...)` (a Spring Data derived query method,
covered in Part V) returns `Optional<User>` rather than `User` — its return
type itself documents that "no such user" is a normal possible outcome, not
something the method signature hides. `.orElseThrow(...)` is the equivalent of
Python's:

```python
user = repository.find_by_username(name)
if user is None:
    raise BusinessException.not_found(...)
return user
```

— except the `Optional<User>` return type makes the "might not exist" case
visible in the method signature itself, at compile time, rather than something
a caller has to already know to check for. `delete(Long id)`, further down the
same file, shows a third `Optional` method entirely — `.ifPresentOrElse(...)`
takes two callbacks, one for "present," one for "empty," instead of throwing at
all.

### 4.4 Try It

Look at `findById` and `findByUsername` in `UserServiceImpl` above. Both follow
the identical `.orElseThrow(...)` pattern — write out, in your own words, what
would happen to a caller of `findById` if you deleted the `.orElseThrow(...)`
call entirely and just returned the bare `Optional<User>` from the method
(hint: think about what type the method signature declares it returns).

---
