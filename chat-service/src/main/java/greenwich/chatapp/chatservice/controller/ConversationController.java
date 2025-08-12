package greenwich.chatapp.chatservice.controller;

import greenwich.chatapp.chatservice.dto.request.ConversationCreateRequest;
import greenwich.chatapp.chatservice.dto.request.ConversationAddMemberRequest;
import greenwich.chatapp.chatservice.dto.response.ConversationResponse;
import greenwich.chatapp.chatservice.service.ConversationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/chat/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;

    @PostMapping
    public ResponseEntity<ConversationResponse> createConversation(@RequestBody ConversationCreateRequest request) {
        return conversationService.createConversation(request);
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<ConversationResponse> addMembers(@PathVariable String id, @RequestBody ConversationAddMemberRequest request) {
        return conversationService.addMembers(id, request);
    }

    @DeleteMapping("/{conversationId}/members/{userId}")
    public ResponseEntity<ConversationResponse> removeMember(
            @PathVariable String conversationId,
            @PathVariable String userId) {
        return conversationService.removeMember(conversationId, userId);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ConversationResponse>> getUserConversations(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return conversationService.getUserConversations(userId, page, size);
    }
}
