package greenwich.chatapp.notificationservice.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
public class SendNotificationRequest {

    private List<String> userIds;
    private String title;
    private String body;
    private Map<String, Object> data;
}

