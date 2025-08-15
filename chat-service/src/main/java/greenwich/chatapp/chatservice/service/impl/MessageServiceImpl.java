package greenwich.chatapp.chatservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import greenwich.chatapp.chatservice.dto.request.MessageCreateRequest;
import greenwich.chatapp.chatservice.dto.response.MediaMetadataResponse;
import greenwich.chatapp.chatservice.dto.response.MessageResponse;
import greenwich.chatapp.chatservice.entity.ConversationEntity;
import greenwich.chatapp.chatservice.entity.LastMessageEntity;
import greenwich.chatapp.chatservice.entity.MemberEntity;
import greenwich.chatapp.chatservice.entity.MessageEntity;
import greenwich.chatapp.chatservice.feignclient.MediaServiceClient;
import greenwich.chatapp.chatservice.repository.ConversationRepository;
import greenwich.chatapp.chatservice.repository.MessageRepository;
import greenwich.chatapp.chatservice.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
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
    private final ModelMapper modelMapper;

    @Override
    public ResponseEntity<MessageResponse> createMessage(MessageCreateRequest request) {
        MemberEntity sender = MemberEntity.builder()
                .userId(request.getSenderId())
                .displayName(request.getSenderName())
                .avatar(request.getSenderAvatar())
                .build();

        MessageEntity message = MessageEntity.builder()
                .conversationId(request.getConversationId())
                .sender(sender)
                .type("text")
                .content(request.getContent())
                .createdAt(LocalDateTime.now())
                .build();

        MessageEntity savedMessage = messageRepository.save(message);

        updateLastMessage(request.getConversationId(), sender, savedMessage.getType(), savedMessage.getContent(), savedMessage.getId(), savedMessage.getCreatedAt());

        return ResponseEntity.ok(modelMapper.map(savedMessage, MessageResponse.class));
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
                .displayName(senderName)
                .avatar(senderAvatar)
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
            responses.add(modelMapper.map(savedMessage, MessageResponse.class));

            // Cập nhật lastMessage = file cuối cùng
            updateLastMessage(conversationId, sender, "media", metadataJson, savedMessage.getId(), savedMessage.getCreatedAt());
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