package greenwich.chatapp.translationservice.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemberResponse {
    private String userId;
    private String fullName;
    private String imageUrl;
    private String role;
    private LocalDateTime joinedAt;
}
