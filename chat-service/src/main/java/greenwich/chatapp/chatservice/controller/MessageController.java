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
    public void updateMessages(
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

    @GetMapping("/conversation/{conversationId}")
    public ResponseEntity<List<MessageResponse>> getMessagesByConversation(
            @PathVariable String conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return messageService.getMessagesByConversation(conversationId, page, size);
    }
}
