package greenwich.chatapp.apigateway.config;

import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import greenwich.chatapp.apigateway.filter.AuthenticationFilter;

@RequiredArgsConstructor
@Configuration
public class GatewayConfig {
    private final AuthenticationFilter authenticationFilter;

    @Bean
    public RouteLocator routes(RouteLocatorBuilder builder) {
        return builder.routes()
                .route("auth-service-api", r -> r.path("/api/v1/auth/**")
                        .uri("lb://auth-service"))
                .route("auth-service-oauth2", r -> r.path("/oauth2/**")
                        .uri("lb://auth-service"))
                .route("chat-service", r -> r.path("/api/v1/chat/**")
                        .filters(f -> f.filter(authenticationFilter))
                        .uri("lb://chat-service"))
                .route("presence-service", r -> r.path("/api/v1/presence/**")
                        .filters(f -> f.filter(authenticationFilter))
                        .uri("lb://presence-service"))
                .route("translation-service", r -> r.path("/api/v1/translate/**")
                        .filters(f -> f.filter(authenticationFilter))
                        .uri("lb://translation-service"))
                .build();
    }
}
