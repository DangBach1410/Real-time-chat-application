package greenwich.chatapp.chatservice.dto.response;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationResponse {
    private String id;
    private String type;
    private String name;
    private String imageUrl;
    private List<MemberResponse> members;
    private LastMessageResponse lastMessage;
    private LocalDateTime lastMessageAt;
    private LocalDateTime createdAt;
}
