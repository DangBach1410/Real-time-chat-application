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
    private String type; // text | image | video | file
    private String content;
    private LocalDateTime createdAt;
}
