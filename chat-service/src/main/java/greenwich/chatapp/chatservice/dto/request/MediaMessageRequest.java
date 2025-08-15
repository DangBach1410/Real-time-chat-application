package greenwich.chatapp.chatservice.dto.request;

import lombok.*;
import org.springframework.web.multipart.MultipartFile;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MediaMessageRequest {
    private String conversationId;
    private String senderId;
    private String senderName;
    private String senderAvatar;
    private String type;
    private MultipartFile file;
}

