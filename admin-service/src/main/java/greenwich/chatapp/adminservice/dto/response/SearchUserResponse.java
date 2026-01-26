package greenwich.chatapp.adminservice.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SearchUserResponse {
    private String id;
    private String fullName;
    private String imageUrl;
    private String email;
    private String status;
}
