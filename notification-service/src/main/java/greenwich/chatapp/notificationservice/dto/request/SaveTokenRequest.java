package greenwich.chatapp.notificationservice.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SaveTokenRequest {
    private String userId;
    private String expoPushToken;
}
