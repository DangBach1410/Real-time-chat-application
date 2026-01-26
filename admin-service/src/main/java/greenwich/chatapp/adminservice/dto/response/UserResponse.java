package greenwich.chatapp.adminservice.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserResponse {
    private int status;
    private String message;
}
