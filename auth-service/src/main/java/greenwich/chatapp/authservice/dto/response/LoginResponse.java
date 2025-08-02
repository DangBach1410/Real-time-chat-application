package greenwich.chatapp.authservice.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {
    private int status;
    private String message;

    private String userId;
    private String accessToken;
    private String refreshToken;
}
