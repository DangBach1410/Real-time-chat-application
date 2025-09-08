package greenwich.chatapp.authservice.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FriendRequestResponse {
    private int status;
    private String message;
    private String requestId;
    private String senderId;
    private String receiverId;
}