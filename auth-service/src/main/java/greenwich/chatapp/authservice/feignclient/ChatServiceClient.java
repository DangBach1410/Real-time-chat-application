package greenwich.chatapp.authservice.feignclient;

import greenwich.chatapp.authservice.dto.request.ConversationCreateRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "chat-service", url = "${chat.service.url}")
public interface ChatServiceClient {

    @PostMapping(value = "/api/v1/chat/conversations")
    void createConversation(@RequestBody ConversationCreateRequest request);

    @PutMapping(value = "/api/v1/chat/conversations")
    void updateConversations(
            @RequestParam String userId,
            @RequestParam String fullName,
            @RequestParam String imageUrl
    );

    @PutMapping(value = "/api/v1/chat/messages")
    void updateMessages(
            @RequestParam String userId,
            @RequestParam String fullName,
            @RequestParam String imageUrl
    );

}
