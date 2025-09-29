package greenwich.chatapp.chatservice.controller;

import greenwich.chatapp.chatservice.dto.request.ConversationCreateRequest;
import greenwich.chatapp.chatservice.dto.request.ConversationAddMemberRequest;
import greenwich.chatapp.chatservice.dto.response.ConversationResponse;
import greenwich.chatapp.chatservice.dto.response.MemberResponse;
import greenwich.chatapp.chatservice.dto.response.MessageResponse;
import greenwich.chatapp.chatservice.service.ConversationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/chat/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;

    @PutMapping
    public void updateMemberInfoInConversations(
            @RequestParam String userId,
            @RequestParam String fullName,
            @RequestParam String imageUrl) {    
        conversationService.updateMemberInfoInConversations(userId, fullName, imageUrl);
    }

    @PutMapping(value = "/{id}/update-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ConversationResponse> updateImageOfConversation(
            @PathVariable String id,
            @RequestPart("file") MultipartFile file) {
        return conversationService.updateImageOfConversation(id, file);
    }

    @PutMapping("/{id}/update-name")
    public ResponseEntity<ConversationResponse> updateNameOfConversation(
            @PathVariable String id,
            @RequestParam String name) {
        return conversationService.updateNameOfConversation(id, name);
    }

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

    @GetMapping("/{conversationId}/members")
    public ResponseEntity<List<MemberResponse>> getMembers(@PathVariable String conversationId) {
        return conversationService.getMembers(conversationId);
    }

    @GetMapping("/{conversationId}/media")
    public ResponseEntity<List<MessageResponse>> getMedia(
            @PathVariable String conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return conversationService.getMedia(conversationId, page, size);
    }

    @GetMapping("/{conversationId}/files")
    public ResponseEntity<List<MessageResponse>> getFiles(
            @PathVariable String conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return conversationService.getFiles(conversationId, page, size);
    }

    @GetMapping("/{conversationId}/links")
    public ResponseEntity<List<MessageResponse>> getLinks(
            @PathVariable String conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return conversationService.getLinks(conversationId, page, size);
    }
}
