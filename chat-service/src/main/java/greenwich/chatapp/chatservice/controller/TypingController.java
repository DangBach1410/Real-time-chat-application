package greenwich.chatapp.chatservice.controller;

import greenwich.chatapp.chatservice.dto.request.TypingEventRequest;
import greenwich.chatapp.chatservice.dto.response.TypingEventResponse;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class TypingController {

    private final SimpMessagingTemplate messagingTemplate;

    public TypingController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/typing")
    public void handleTyping(@Payload TypingEventRequest typingEvent) {
        // publish tới các client trong conversation
        String destination = "/topic/conversations/" + typingEvent.getConversationId() + "/typing";
        TypingEventResponse typingEventResponse = TypingEventResponse.builder()
                .conversationId(typingEvent.getConversationId())
                .userId(typingEvent.getUserId())
                .typing(typingEvent.isTyping())
                .build();
        messagingTemplate.convertAndSend(destination, typingEventResponse);
    }
}
