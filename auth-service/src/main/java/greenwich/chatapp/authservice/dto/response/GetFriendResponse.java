package greenwich.chatapp.authservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class GetFriendResponse {
    private String id;
    private String fullName;
    private String email;
    private String imageUrl;
}
