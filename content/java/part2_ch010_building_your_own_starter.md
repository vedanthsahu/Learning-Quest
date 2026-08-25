## 10. Building Your Own Starter

### 10.1 The Concept

Part II §7.2 mentioned that `@EnableAutoConfiguration` is what makes adding a
dependency like `spring-boot-starter-web` "just work" with no manual setup —
you get an embedded Tomcat, sensible defaults, and the beans you need, without
writing any configuration yourself. That mechanism isn't limited to Spring's
own starters. `common-lib` builds two of its own, and reading them is the
clearest way to see what "autoconfiguration" actually *is*: a class annotated
`@AutoConfiguration`, guarded by conditions that decide whether it should
activate at all, that defines beans the same way any `@Configuration` class
would.

There's no equivalent concept in typical Python web frameworks — the closest
comparison is a Flask extension's `init_app(app)` pattern, except Spring's
version doesn't need to be called explicitly at all; it activates itself
based on what's on the classpath and what properties are set.

### 10.2 In This Codebase: Conditional Activation

`SecurityAutoConfiguration` is the smallest, clearest example — the whole
class body is empty, because its entire job is *deciding whether to activate*
and then importing the real configuration:

```java
package com.ecommerce.commonlib.security;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.jwt.JwtDecoder;

/**
 * Autoconfigures the resource-server security stack for every servlet service
 * that has {@code spring-security} on the classpath.
 *
 * <p>{@code @Import(BaseSecurityConfig.class)} is intentional — it tells Spring to
 * process {@code BaseSecurityConfig} as a {@code @Configuration}, so its
 * {@code @Bean} methods ({@code securityFilterChain}, {@code jwtAuthenticationConverter})
 * are discovered and registered. A plain {@code @Bean} factory method would only
 * create the instance without processing its inner {@code @Bean} methods.</p>
 *
 * <p>Disable by setting {@code ecommerce.security.enabled=false}.</p>
 */
@AutoConfiguration
@ConditionalOnClass({HttpSecurity.class, JwtDecoder.class})
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "ecommerce.security", name = "enabled", havingValue = "true", matchIfMissing = true)
@EnableConfigurationProperties(SecurityProperties.class)
@EnableMethodSecurity
@Import(BaseSecurityConfig.class)
public class SecurityAutoConfiguration {
}
```

**Source:** `common-lib/common-security/src/main/java/com/ecommerce/commonlib/security/SecurityAutoConfiguration.java`

Every annotation on this class is a gate, and all of them have to pass before
anything inside activates:

- **`@ConditionalOnClass({HttpSecurity.class, JwtDecoder.class})`** — only activate if Spring Security's classes are actually present on this service's classpath. A service that never added the security dependency simply never triggers this configuration at all — no error, no no-op bean, it's as if this class doesn't exist for that service.
- **`@ConditionalOnWebApplication(type = SERVLET)`** — only for a traditional servlet-based web app, not a reactive (WebFlux) one.
- **`@ConditionalOnProperty(prefix = "ecommerce.security", name = "enabled", havingValue = "true", matchIfMissing = true)`** — only if `ecommerce.security.enabled` isn't explicitly set to `false`. `matchIfMissing = true` means the *absence* of the property still counts as enabled — opt-out, not opt-in.
- **`@EnableConfigurationProperties(SecurityProperties.class)`** — this is what actually binds `ecommerce.security.*` YAML onto the `SecurityProperties` record from Part I §1.2.
- **`@Import(BaseSecurityConfig.class)`** — once every condition above passes, pull in the real configuration class that defines the actual security filter chain (Part VII §14 covers `BaseSecurityConfig` itself in full).

The Javadoc's explanation of *why* `@Import` rather than a `@Bean` factory
method is worth reading closely — it's the kind of subtlety that only becomes
obvious once you've hit the bug it prevents: a plain `@Bean` method returning
`new BaseSecurityConfig(...)` would register that one object, but Spring would
never scan *inside* it for its own `@Bean` methods (`securityFilterChain`,
`jwtAuthenticationConverter`) — `@Import` is what tells Spring to treat the
target class as a configuration source in its own right.

### 10.3 In This Codebase: Building the Beans Themselves

`RestClientAutoConfiguration` shows the other half — a starter that doesn't
just import something else, but constructs real beans (a connection pool, an
HTTP client, a configured `RestClient.Builder`) directly, each one skippable
if the consuming service already defined its own:

```java
@AutoConfiguration(after = WebAutoConfiguration.class)
@ConditionalOnClass({RestClient.class, CloseableHttpClient.class})
@EnableConfigurationProperties(RestClientProperties.class)
public class RestClientAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public PoolingHttpClientConnectionManager connectionManager(RestClientProperties props) {
        PoolingHttpClientConnectionManager cm = new PoolingHttpClientConnectionManager();
        cm.setMaxTotal(props.getPool().getMaxTotal());
        cm.setDefaultMaxPerRoute(props.getPool().getMaxPerRoute());
        cm.setDefaultConnectionConfig(ConnectionConfig.custom()
                .setConnectTimeout(Timeout.of(props.getConnectTimeout()))
                .setSocketTimeout(Timeout.of(props.getReadTimeout()))
                .setTimeToLive(TimeValue.of(props.getPool().getKeepAlive()))
                .build());
        return cm;
    }

    @Bean
    @ConditionalOnMissingBean
    public CloseableHttpClient httpClient(PoolingHttpClientConnectionManager cm,
                                          RestClientProperties props) {
        RequestConfig requestConfig = RequestConfig.custom()
                .setConnectionRequestTimeout(Timeout.of(props.getConnectTimeout()))
                .setResponseTimeout(Timeout.of(props.getReadTimeout()))
                .build();
        return HttpClients.custom()
                .setConnectionManager(cm)
                .setDefaultRequestConfig(requestConfig)
                .evictExpiredConnections()
                .evictIdleConnections(TimeValue.of(props.getPool().getEvictIdleAfter()))
                .build();
    }

    @Bean
    @ConditionalOnMissingBean(RestClient.Builder.class)
    public RestClient.Builder restClientBuilder(CloseableHttpClient httpClient) {
        HttpComponentsClientHttpRequestFactory factory =
                new HttpComponentsClientHttpRequestFactory(httpClient);
        return RestClient.builder()
                .requestFactory(factory)
                .requestInterceptor(new CorrelationIdPropagationInterceptor());
    }

    static class CorrelationIdPropagationInterceptor implements ClientHttpRequestInterceptor {
        @Override
        public ClientHttpResponse intercept(HttpRequest request, byte[] body,
                                             ClientHttpRequestExecution execution) throws IOException {
            String correlationId = MDC.get(MdcKey.CORRELATION_ID);
            String requestId = MDC.get(MdcKey.REQUEST_ID);
            if (correlationId != null) {
                request.getHeaders().set(CorrelationIdFilter.CORRELATION_ID_HEADER, correlationId);
            }
            if (requestId != null) {
                request.getHeaders().set(CorrelationIdFilter.REQUEST_ID_HEADER, requestId);
            }
            return execution.execute(request, body);
        }
    }
}
```

**Source:** `common-lib/common-spring/src/main/java/com/ecommerce/commonlib/autoconfigure/RestClientAutoConfiguration.java`

Every `@Bean` method here is guarded by `@ConditionalOnMissingBean` — read
that as "only create this if nobody else already did." The Javadoc spells out
exactly why: a service that needs Eureka-based load balancing can declare its
own `@LoadBalanced RestClient.Builder` bean, and this autoconfiguration will
quietly step aside rather than conflict with it. That's the general shape of
every Spring Boot starter you've ever used without thinking about it —
sensible defaults, activated conditionally, always overridable.

`CorrelationIdPropagationInterceptor` (a private static nested class — a class
defined entirely inside another class, used only there) is what makes Part X
§10.5's distributed tracing work automatically: every outbound HTTP call made
through this shared `RestClient.Builder` picks up the current request's
correlation ID from `MDC` (thread-local-ish request-scoped storage) and
forwards it as a header, with zero effort from whoever wrote the calling code.

### 10.4 Try It

`RestClientAutoConfiguration` is annotated `@AutoConfiguration(after = WebAutoConfiguration.class)`.
Given that its own `@Bean` methods build an HTTP *client* (for making outbound
calls), not a *server*, form a hypothesis for why its author chose to order it
to run `after` the web server's own autoconfiguration rather than leaving the
ordering unspecified.

---
