package greenwich.chatapp.chatservice.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "messages")
public class MessageEntity {
    @Id
    private String id;
    private String conversationId;
    private MemberEntity sender;
    private String type;
    private String content; // TEXT thì là chuỗi, MEDIA thì là JSON string chứa metadata
    private LocalDateTime createdAt;
}
