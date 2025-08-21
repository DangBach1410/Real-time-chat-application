package greenwich.chatapp.chatservice.entity;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemberEntity {
    private String userId;
    private String fullName;
    private String imageUrl;
    private String role; // admin | member
    private LocalDateTime joinedAt;
}