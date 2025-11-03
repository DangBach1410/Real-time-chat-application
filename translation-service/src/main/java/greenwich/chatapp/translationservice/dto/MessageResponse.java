package greenwich.chatapp.translationservice.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageResponse {
    private String id;
    private String conversationId;
    private MemberResponse sender;
    private String type; // "text" or "text-translation"
    private String content;
    private String createdAt;
}

