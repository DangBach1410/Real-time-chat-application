package greenwich.chatapp.chatservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import greenwich.chatapp.chatservice.dto.request.MessageCreateRequest;
import greenwich.chatapp.chatservice.dto.response.LinkPreviewResponse;
import greenwich.chatapp.chatservice.dto.response.MediaMetadataResponse;
import greenwich.chatapp.chatservice.dto.response.MessageResponse;
import greenwich.chatapp.chatservice.entity.ConversationEntity;
import greenwich.chatapp.chatservice.entity.LastMessageEntity;
import greenwich.chatapp.chatservice.entity.MemberEntity;
import greenwich.chatapp.chatservice.entity.MessageEntity;
import greenwich.chatapp.chatservice.feignclient.MediaServiceClient;
import greenwich.chatapp.chatservice.repository.ConversationRepository;
import greenwich.chatapp.chatservice.repository.MessageRepository;
import greenwich.chatapp.chatservice.service.LinkPreviewService;
import greenwich.chatapp.chatservice.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageServiceImpl implements MessageService {

    private final MediaServiceClient mediaServiceClient;
    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final LinkPreviewService linkPreviewService;
    private final ModelMapper modelMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public ResponseEntity<MessageResponse> createMessage(MessageCreateRequest request) {
        MemberEntity sender = MemberEntity.builder()
                .userId(request.getSenderId())
                .fullName(request.getSenderFullName())
                .imageUrl(request.getSenderImageUrl())
                .build();

        String type = (request.getType() != null) ? request.getType() : "text";
        String content = request.getContent();

        // Nếu message là link -> fetch metadata và lưu JSON string
        if ("link".equalsIgnoreCase(type)) {
            LinkPreviewResponse meta = linkPreviewService.fetchMetadata(content);
            try {
                content = new ObjectMapper().writeValueAsString(meta);
            } catch (Exception e) {
                throw new RuntimeException("Failed to serialize link metadata", e);
            }
        }

        MessageEntity message = MessageEntity.builder()
                .conversationId(request.getConversationId())
                .sender(sender)
                .type(type)
                .content(content)
                .createdAt(LocalDateTime.now())
                .build();

        MessageEntity savedMessage = messageRepository.save(message);

        updateLastMessage(
                request.getConversationId(),
                sender,
                type,
                content,
                savedMessage.getId(),
                savedMessage.getCreatedAt()
        );

        MessageResponse response = modelMapper.map(savedMessage, MessageResponse.class);

        // Broadcast cho tất cả client đã subscribe conversation
        messagingTemplate.convertAndSend(
                "/topic/conversations/" + request.getConversationId(),
                response
        );

        return ResponseEntity.ok(response);
    }

    @Override
    public ResponseEntity<List<MessageResponse>> getMessagesByConversation(String conversationId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        List<MessageResponse> messages = messageRepository
                .findByConversationIdOrderByCreatedAtDesc(conversationId, pageable)
                .getContent()
                .stream()
                .map(m -> modelMapper.map(m, MessageResponse.class))
                .collect(Collectors.toList());
        return ResponseEntity.ok(messages);
    }

    @Override
    public ResponseEntity<List<MessageResponse>> createMediaMessages(
            String conversationId, String senderId, String senderName, String senderAvatar, List<MultipartFile> files) {

        MemberEntity sender = MemberEntity.builder()
                .userId(senderId)
                .fullName(senderName)
                .imageUrl(senderAvatar)
                .build();

        // Gọi Media-service upload tất cả files
        List<MediaMetadataResponse> uploadedFiles = mediaServiceClient.uploadFiles(files);

        List<MessageResponse> responses = new ArrayList<>();

        for (MediaMetadataResponse meta : uploadedFiles) {
            String metadataJson;
            try {
                metadataJson = new ObjectMapper().writeValueAsString(meta);
            } catch (Exception e) {
                throw new RuntimeException("Failed to serialize media metadata", e);
            }

            MessageEntity message = MessageEntity.builder()
                    .conversationId(conversationId)
                    .sender(sender)
                    .type("media")
                    .content(metadataJson)
                    .createdAt(LocalDateTime.now())
                    .build();

            MessageEntity savedMessage = messageRepository.save(message);
            MessageResponse response = modelMapper.map(savedMessage, MessageResponse.class);

            responses.add(response);

            // Cập nhật lastMessage = file cuối cùng
            updateLastMessage(conversationId, sender, "media", metadataJson, savedMessage.getId(), savedMessage.getCreatedAt());

            // Broadcast mỗi file gửi
            messagingTemplate.convertAndSend(
                    "/topic/conversations/" + conversationId,
                    response
            );
        }
        return ResponseEntity.ok(responses);
    }

    private void updateLastMessage(String conversationId, MemberEntity sender, String type, String content, String messageId, LocalDateTime createdAt) {
        ConversationEntity conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        LastMessageEntity lastMessage = LastMessageEntity.builder()
                .messageId(messageId)
                .sender(sender)
                .type(type)
                .content(content)
                .createdAt(createdAt)
                .build();

        conversation.setLastMessage(lastMessage);
        conversation.setLastMessageAt(createdAt);
        conversationRepository.save(conversation);
    }
}
