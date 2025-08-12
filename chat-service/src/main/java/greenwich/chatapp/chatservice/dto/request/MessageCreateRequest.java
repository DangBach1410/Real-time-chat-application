package greenwich.chatapp.chatservice.dto.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageCreateRequest {
    private String conversationId;
    private String senderId;
    private String senderName;
    private String senderAvatar;
    private String type;
    private String content;
}