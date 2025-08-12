package greenwich.chatapp.chatservice.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemberResponse {
    private String userId;
    private String displayName;
    private String avatar;
    private String role;
    private LocalDateTime joinedAt;
}
