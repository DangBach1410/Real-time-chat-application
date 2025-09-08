package greenwich.chatapp.authservice.feignclient;

import greenwich.chatapp.authservice.dto.request.ConversationCreateRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "chat-service", url = "${chat.service.url}")
public interface ChatServiceClient {

    @PostMapping(value = "/api/v1/chat/conversations")
    void createConversation(@RequestBody ConversationCreateRequest request);
}
