package greenwich.chatapp.chatservice.util;

import greenwich.chatapp.chatservice.entity.MemberEntity;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Base64;
import java.util.List;

/**
 * Utility class for extracting authenticated user information from request headers.
 * The X-User-Token header is set by the API Gateway and contains Base64-encoded userId:role information.
 */
@Slf4j
@Component
public class AuthenticationUtil {

    private static final String X_USER_TOKEN_HEADER = "X-User-Token";

    /**
     * Extracts the authenticated userId from the X-User-Token header.
     * The token format is: Base64(userId:role)
     *
     * @return The userId of the authenticated user, or null if not found
     */
    public String getAuthenticatedUserId() {
        try {
            var request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();
            String xUserToken = request.getHeader(X_USER_TOKEN_HEADER);

            if (!StringUtils.hasText(xUserToken)) {
                log.warn("X-User-Token header is missing");
                return null;
            }

            String decodedToken = new String(Base64.getDecoder().decode(xUserToken));
            // Format: userId:role
            String[] parts = decodedToken.split(":");
            if (parts.length < 1) {
                log.warn("Invalid X-User-Token format");
                return null;
            }

            return parts[0];  // Return userId (first part)
        } catch (Exception e) {
            log.error("Failed to extract authenticated userId from X-User-Token", e);
            return null;
        }
    }



    /**
     * Validates that the authenticated user is a member of the conversation.
     * Extracts the authenticated userId and checks if it exists in the members list.
     *
     * @param members The list of MemberEntity to check against
     * @return true if the authenticated user is in the members list, false otherwise
     */
    public boolean isAuthenticatedUserInConversationMembers(List<MemberEntity> members) {
        String authenticatedUserId = getAuthenticatedUserId();
        
        if (!StringUtils.hasText(authenticatedUserId)) {
            log.warn("Could not extract authenticated user information");
            return false;
        }

        if (members == null || members.isEmpty()) {
            log.warn("Conversation has no members");
            return false;
        }

        // Check if authenticated user is in the members list
        boolean isMember = members.stream()
                .anyMatch(member -> authenticatedUserId.equals(member.getUserId()));
        
        if (!isMember) {
            log.warn("User {} is not a member of this conversation", authenticatedUserId);
        }

        return isMember;
    }
}
