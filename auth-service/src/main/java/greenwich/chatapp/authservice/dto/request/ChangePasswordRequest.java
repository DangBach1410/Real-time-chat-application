package greenwich.chatapp.authservice.dto.request;

import lombok.Getter;

@Getter
public class ChangePasswordRequest {
    private String oldPassword;
    private String newPassword;
    private String confirmPassword;
}
