package greenwich.chatapp.chatservice.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LastMessageResponse {
    private String messageId;
    private MemberResponse sender;
    private String type;
    private String content;
    private LocalDateTime createdAt;
}
