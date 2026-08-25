## 41. JUnit5 and Mockito in This Repo

### 41.1 The Concept

JUnit5 is Java's standard testing framework — roughly `pytest`'s counterpart.
Mockito is a mocking library — the Java analogue of `unittest.mock` —
letting a test replace a real collaborator (a repository, a client) with a
fake one whose behavior you control, so a test can exercise `UserServiceImpl`'s
own logic without a real database or a real Keycloak server anywhere nearby.

### 41.2 Testing a Service in Isolation

```java
package com.ecommerce.authservice.service;

import com.ecommerce.authservice.dto.request.RegisterRequest;
import com.ecommerce.authservice.dto.request.UpdateUserRequest;
import com.ecommerce.authservice.dto.response.UserResponse;
import com.ecommerce.authservice.entity.User;
import com.ecommerce.authservice.mapper.UserMapper;
import com.ecommerce.authservice.repository.UserRepository;
import com.ecommerce.commonlib.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleService roleService;

    private UserMapper userMapper;
    private UserServiceImpl userService;

    @BeforeEach
    void setUp() {
        userMapper = new UserMapper(new ModelMapper());
        userService = new UserServiceImpl(userRepository, userMapper, roleService, null);
    }

    @Test
    void updateShouldReturnUserResponse() {
        UpdateUserRequest request = new UpdateUserRequest();
        request.setFullName("Updated Name");

        User existingUser = new User();
        existingUser.setId(1L);
        existingUser.setUsername("testuser");

        when(userRepository.findById(1L)).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenReturn(existingUser);

        UserResponse result = userService.update(1L, request);

        assertEquals("testuser", result.getUsername());
        verify(userRepository).save(existingUser);
    }

    @Test
    void updateShouldThrowWhenUserNotFound() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());
        assertThrows(BusinessException.class, () -> userService.update(999L, new UpdateUserRequest()));
    }

    @Test
    void registerShouldThrowWhenUsernameExists() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("existing");
        request.setEmail("test@test.com");
        request.setPhone("0123456789");

        when(userRepository.existsByUsername("existing")).thenReturn(true);

        assertThrows(BusinessException.class, () -> userService.register(request));
        verify(userRepository, never()).save(any());
    }
}
```

**Source:** `auth-service/src/test/java/com/ecommerce/authservice/service/UserServiceImplTest.java` (trimmed — `findById`/`findAllUsers` tests follow the same shape)

`@ExtendWith(MockitoExtension.class)` activates Mockito's JUnit5 integration
— specifically, what makes `@Mock` fields actually get populated with fake
objects automatically before each test. `@Mock private UserRepository userRepository`
creates a fake implementation of the `UserRepository` interface (Part V
§20.3) with no real database behind it at all — every method returns `null`
(or an empty `Optional`/collection) until a test explicitly programs it with
`when(...).thenReturn(...)`.

`updateShouldReturnUserResponse` reads as a direct, literal test of
`UserServiceImpl.update` (Part I §4.3): program the mock repository to return
a specific `User` when asked for ID `1L`, call the real method, and assert
the result matches expectations. `verify(userRepository).save(existingUser)`
is a different kind of assertion — not "what did this return," but "was
this specific method actually called, with this specific argument" —
confirming a *side effect* happened, not just a return value.

`registerShouldThrowWhenUsernameExists` tests the very first `if` branch of
`UserServiceImpl.register` (Part I §4.3) — `existsByUsername(...)` returning
`true` should short-circuit into `BusinessException.conflict(...)` before
ever reaching the Keycloak call or the repository save. `verify(userRepository, never()).save(any())`
confirms the negative case explicitly: not just that an exception was thrown,
but that the method genuinely stopped early rather than saving anyway and
then throwing.

Notice `new UserServiceImpl(userRepository, userMapper, roleService, null)` —
the fourth constructor argument (`KeycloakAuthClient`) is passed as `null`
directly, not mocked at all. That's safe specifically because
`registerShouldThrowWhenUsernameExists` exits before `register(...)` ever
touches `keycloakAuthClient` — a real, deliberate minimal-setup choice that
only works because of exactly how early that method's guard clauses run.

### 41.3 A Different Style: Manual Instantiation Instead of Mocking Everything

`AuthControllerTest` takes a noticeably different approach — most
dependencies are real objects, not mocks:

```java
@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private UserService userService;

    private KeycloakClientProperties keycloakProperties;
    private SsoProperties ssoProperties;
    private KeycloakAuthClient keycloakAuthClient;
    private SsoSessionStore ssoSessionStore;
    private AuthController authController;

    @BeforeEach
    void setUp() {
        keycloakProperties = new KeycloakClientProperties();
        keycloakProperties.setServerUrl("http://localhost:8080");
        keycloakProperties.setRealm("test");
        keycloakProperties.setClientId("test-client");

        ssoProperties = new SsoProperties();
        ssoSessionStore = new SsoSessionStore(ssoProperties);
        keycloakAuthClient = new KeycloakAuthClient(RestClient.builder(), keycloakProperties);
        authController = new AuthController(
                userService, keycloakAuthClient, keycloakProperties, ssoProperties, ssoSessionStore);
    }

    @Test
    void ssoLoginShouldRedirectToKeycloak() {
        ResponseEntity<Void> response = authController.ssoLogin(null);

        assertEquals(HttpStatus.FOUND, response.getStatusCode());
        URI location = response.getHeaders().getLocation();
        assertNotNull(location);
        assertTrue(location.toString().startsWith(
                "http://localhost:8080/realms/test/protocol/openid-connect/auth"));
        assertTrue(location.toString().contains("client_id=test-client"));
    }
}
```

**Source:** `auth-service/src/test/java/com/ecommerce/authservice/controller/AuthControllerTest.java` (trimmed)

Only `UserService` is `@Mock`ed here — `keycloakProperties`, `ssoProperties`,
`ssoSessionStore`, and `keycloakAuthClient` are all constructed as real
objects (no Spring context at all — this is a plain unit test, not a
`@WebMvcTest`), with `authController` built by calling its constructor
directly, by hand — the constructor-injection pattern from Part III §12 shown
from the *testing* side, where "inject a dependency" just means "pass an
argument to `new AuthController(...)`." `ssoLoginShouldRedirectToKeycloak`
tests real, unmocked URL-building logic (Part IV §17.2's `ssoLogin` method)
end to end — the assertion checks the actual, fully-constructed Keycloak
authorize URL, string-matched against real `KeycloakClientProperties` values
set two lines above, rather than mocking that logic away and testing nothing
real about it.

### 41.4 Try It

`AuthControllerTest` mocks `UserService` but not `KeycloakAuthClient`, even
though both are real dependencies of `AuthController`. Looking at which test
methods exist in this file (`registerShouldDelegateToUserService`,
`ssoLoginShouldRedirectToKeycloak`, and others), form a hypothesis for why
the author chose to mock exactly one of the controller's five dependencies
and construct the rest for real.

---
