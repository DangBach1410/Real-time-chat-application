package greenwich.chatapp.chatservice.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CallRequest {
    private String type;            // "audio" hoặc "video"
    private String conversationId;
    private String conversationName;
    private String callerId;
    private String callerName;
    private String callerImage;
}
