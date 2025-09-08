package greenwich.chatapp.authservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class GetFriendRequestResponse {
    private String senderId;
    private String senderFullName;
    private String senderEmail;
    private String senderImageUrl;
}
