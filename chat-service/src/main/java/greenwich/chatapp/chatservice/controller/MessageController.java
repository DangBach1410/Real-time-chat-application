package greenwich.chatapp.chatservice.controller;

import greenwich.chatapp.chatservice.dto.request.MessageCreateRequest;
import greenwich.chatapp.chatservice.dto.response.MessageResponse;
import greenwich.chatapp.chatservice.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/chat/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @PutMapping()
    public void updateSenderInfoInMessages(
            @RequestParam String userId,
            @RequestParam String fullName,
            @RequestParam String imageUrl) {
        messageService.updateSenderInfoInMessages(userId, fullName, imageUrl);
    }

    @PostMapping
    public ResponseEntity<MessageResponse> createMessage(@RequestBody MessageCreateRequest request) {
        return messageService.createMessage(request);
    }

    @PostMapping(value = "/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<List<MessageResponse>> createMediaMessages(
            @RequestParam String conversationId,
            @RequestParam String senderId,
            @RequestParam String senderName,
            @RequestParam String senderAvatar,
            @RequestPart("files") List<MultipartFile> files
    ) {
        return messageService.createMediaMessages(conversationId, senderId, senderName, senderAvatar, files);
    }

    @PostMapping("/notification")
    public ResponseEntity<MessageResponse> createNotificationMessage(@RequestBody MessageCreateRequest request) {
        return messageService.createNotificationMessage(request);
    }

    @GetMapping("/conversation/{conversationId}")
    public ResponseEntity<List<MessageResponse>> getMessagesByConversation(
            @PathVariable String conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return messageService.getMessagesByConversation(conversationId, page, size);
    }
    @GetMapping("/search")
    public ResponseEntity<List<MessageResponse>> searchMessages(
            @RequestParam String conversationId,
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) { 
        return messageService.searchMessages(conversationId, keyword, page, size);
    }
    @GetMapping("/conversation/{conversationId}/context")
    public ResponseEntity<List<MessageResponse>> getMessageContext(
            @PathVariable String conversationId,
            @RequestParam String messageId,
            @RequestParam(defaultValue = "20") int before,
            @RequestParam(defaultValue = "20") int after
    ) {
        return messageService.getMessageContext(conversationId, messageId, before, after);
    }

    @GetMapping("/conversation/{conversationId}/old")
    public ResponseEntity<List<MessageResponse>> getOldMessages(
            @PathVariable String conversationId,
            @RequestParam String beforeMessageId,
            @RequestParam(defaultValue = "30") int limit
    ) {
        return messageService.getOldMessages(conversationId, beforeMessageId, limit);
    }

    @GetMapping("/conversation/{conversationId}/new")
    public ResponseEntity<List<MessageResponse>> getNewMessages(
            @PathVariable String conversationId,
            @RequestParam String afterMessageId,
            @RequestParam(defaultValue = "30") int limit
    ) {
        return messageService.getNewMessages(conversationId, afterMessageId, limit);
    }
}
