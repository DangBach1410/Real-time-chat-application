package greenwich.chatapp.chatservice.service;

import greenwich.chatapp.chatservice.dto.request.ConversationCreateRequest;
import greenwich.chatapp.chatservice.dto.request.ConversationAddMemberRequest;
import greenwich.chatapp.chatservice.dto.response.ConversationResponse;
import greenwich.chatapp.chatservice.dto.response.MemberResponse;
import greenwich.chatapp.chatservice.dto.response.MessageResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ConversationService {
    ResponseEntity<ConversationResponse> createConversation(ConversationCreateRequest request);
    ResponseEntity<ConversationResponse> updateImageOfConversation(String conversationId, MultipartFile file);
    ResponseEntity<ConversationResponse> addMembers(String conversationId, ConversationAddMemberRequest request);
    ResponseEntity<ConversationResponse> removeMember(String conversationId, String userId);
    ResponseEntity<List<ConversationResponse>> getUserConversations(String userId, int page, int size);
    @Async("taskExecutor")
    void updateMemberInfoInConversations(String userId, String fullName, String imageUrl);
    ResponseEntity<List<MemberResponse>> getMembers(String conversationId);
    ResponseEntity<List<MessageResponse>> getMedia(String conversationId, int page, int size);
    ResponseEntity<List<MessageResponse>> getFiles(String conversationId, int page, int size);
    ResponseEntity<List<MessageResponse>> getLinks(String conversationId, int page, int size);
}