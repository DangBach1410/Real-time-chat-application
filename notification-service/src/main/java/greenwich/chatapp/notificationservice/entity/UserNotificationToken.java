package greenwich.chatapp.notificationservice.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.*;

@Document(collection = "user_notification_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserNotificationToken {

    @Id
    private String id;
    private String userId;
    private String expoPushToken;
}

