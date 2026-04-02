package greenwich.chatapp.authservice.util;

import greenwich.chatapp.authservice.service.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Utility class for extracting authenticated user information from JWT Bearer tokens.
 * The Authorization header contains a JWT token in the format: Bearer <jwt>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AuthenticationUtil {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;

    /**
     * Extracts the authenticated userId from the JWT Bearer token.
     * The Authorization header format is: Bearer <jwt>
     *
     * @return The userId from JWT claims, or null if not found or invalid
     */
    public String getAuthenticatedUserId() {
        try {
            var request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();
            String authHeader = request.getHeader(AUTHORIZATION_HEADER);

            if (!StringUtils.hasText(authHeader)) {
                log.warn("Authorization header is missing");
                return null;
            }

            if (!authHeader.startsWith(BEARER_PREFIX)) {
                log.warn("Authorization header does not start with Bearer");
                return null;
            }

            String token = authHeader.substring(BEARER_PREFIX.length());

            // Validate token
            if (!jwtService.validateToken(token)) {
                log.warn("Invalid or expired JWT token");
                return null;
            }

            // Extract userId from JWT using JwtService
            String userId = jwtService.extractUserId(token);
            
            if (!StringUtils.hasText(userId)) {
                log.warn("userId claim not found in JWT token");
                return null;
            }

            return userId;
        } catch (Exception e) {
            log.error("Failed to extract authenticated userId from JWT token", e);
            return null;
        }
    }
}
