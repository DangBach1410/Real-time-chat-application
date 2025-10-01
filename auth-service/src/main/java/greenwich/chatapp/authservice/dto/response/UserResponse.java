package greenwich.chatapp.authservice.dto.response;

import greenwich.chatapp.authservice.oauth2.common.AuthProvider;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserResponse {
    private int status;
    private String message;

    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private String imageUrl;
    private AuthProvider provider;
}
