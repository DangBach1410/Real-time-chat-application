package greenwich.chatapp.chatservice.entity;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LastMessageEntity {
    private String messageId;
    private MemberEntity sender;
    private String type; // text | image | video | file
    private String content;
    private LocalDateTime createdAt;
}
