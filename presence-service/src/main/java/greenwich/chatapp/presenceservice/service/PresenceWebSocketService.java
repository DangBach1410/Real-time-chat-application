package greenwich.chatapp.presenceservice.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class PresenceWebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    public PresenceWebSocketService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishUpdate(String userId, Long lastSeen) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("userId", userId);
        payload.put("lastSeen", lastSeen);
        messagingTemplate.convertAndSend("/topic/presence", payload);
    }
}

