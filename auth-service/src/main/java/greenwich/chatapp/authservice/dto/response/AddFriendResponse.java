package greenwich.chatapp.authservice.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddFriendResponse {
    private int status;
    private String message;
    private String friendId;
    private String friendFullName;
    private String friendEmail;
    private String friendImageUrl;
}
