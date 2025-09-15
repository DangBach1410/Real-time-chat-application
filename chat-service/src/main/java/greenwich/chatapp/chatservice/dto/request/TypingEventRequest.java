package greenwich.chatapp.chatservice.dto.request;

import lombok.Getter;

@Getter
public class TypingEventRequest {
    private String conversationId;
    private String userId;
    private boolean typing; // true = typing, false = stopped
}
