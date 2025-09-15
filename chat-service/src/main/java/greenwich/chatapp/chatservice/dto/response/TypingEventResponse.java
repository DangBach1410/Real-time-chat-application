package greenwich.chatapp.chatservice.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TypingEventResponse {
    private String conversationId;
    private String userId;
    private boolean typing;
}
