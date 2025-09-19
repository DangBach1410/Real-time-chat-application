package greenwich.chatapp.chatservice.service;

import greenwich.chatapp.chatservice.dto.request.ConversationCreateRequest;
import greenwich.chatapp.chatservice.dto.request.ConversationAddMemberRequest;
import greenwich.chatapp.chatservice.dto.response.ConversationResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;

import java.util.List;

public interface ConversationService {
    ResponseEntity<ConversationResponse> createConversation(ConversationCreateRequest request);
    ResponseEntity<ConversationResponse> addMembers(String conversationId, ConversationAddMemberRequest request);
    ResponseEntity<ConversationResponse> removeMember(String conversationId, String userId);
    ResponseEntity<List<ConversationResponse>> getUserConversations(String userId, int page, int size);
    @Async("taskExecutor")
    void updateMemberInfoInConversations(String userId, String fullName, String imageUrl);
}