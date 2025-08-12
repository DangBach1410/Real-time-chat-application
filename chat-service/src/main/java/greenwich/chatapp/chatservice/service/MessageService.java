package greenwich.chatapp.chatservice.service;

import greenwich.chatapp.chatservice.dto.request.MessageCreateRequest;
import greenwich.chatapp.chatservice.dto.response.MessageResponse;
import org.springframework.http.ResponseEntity;

import java.util.List;

public interface MessageService {
    ResponseEntity<MessageResponse> createMessage(MessageCreateRequest request);
    ResponseEntity<List<MessageResponse>> getMessagesByConversation(String conversationId, int page, int size);
}
