package greenwich.chatapp.chatservice.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "conversations")
public class ConversationEntity {
    @Id
    private String id;
    private String type; // private | group
    private String name; // chỉ có nếu type = group
    private List<MemberEntity> members;
    private LastMessageEntity lastMessage;
    private LocalDateTime lastMessageAt;
    private LocalDateTime createdAt;
}