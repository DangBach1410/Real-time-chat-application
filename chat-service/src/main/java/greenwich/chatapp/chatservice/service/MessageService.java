package greenwich.chatapp.chatservice.service;

import greenwich.chatapp.chatservice.dto.request.MessageCreateRequest;
import greenwich.chatapp.chatservice.dto.response.MessageResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface MessageService {
    @Async("taskExecutor")
    void updateSenderInfoInMessages(String userId, String fullName, String imageUrl);

    ResponseEntity<MessageResponse> createMessage(MessageCreateRequest request);
    ResponseEntity<List<MessageResponse>> getMessagesByConversation(String conversationId, int page, int size);
    ResponseEntity<List<MessageResponse>> createMediaMessages(
            String conversationId, String senderId, String senderName, String senderAvatar, List<MultipartFile> files);
}
