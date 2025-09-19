package greenwich.chatapp.authservice.dto.request;

import lombok.Getter;

@Getter
public class UpdateRequest {
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
}
