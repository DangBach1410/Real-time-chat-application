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
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Update;

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
    private final MongoTemplate mongoTemplate;
    private final int BATCH_SIZE = 1000;

    @Async("taskExecutor")
    @Override
    public void updateSenderInfoInMessages(String userId, String fullName, String imageUrl) {
        long total = mongoTemplate.count(
                Query.query(Criteria.where("sender.userId").is(userId)),
                MessageEntity.class
        );

        int skip = 0;
        while (skip < total) {
            Query batchQuery = new Query(Criteria.where("sender.userId").is(userId))
                    .skip(skip)
                    .limit(BATCH_SIZE);

            Update update = new Update()
                    .set("sender.fullName", fullName)
                    .set("sender.imageUrl", imageUrl);

            mongoTemplate.updateMulti(batchQuery, update, MessageEntity.class);
            skip += BATCH_SIZE;
        }
    }

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
    public ResponseEntity<MessageResponse> createNotificationMessage(MessageCreateRequest request) {
        MemberEntity sender = MemberEntity.builder()
                .userId(request.getSenderId())
                .fullName(request.getSenderFullName())
                .imageUrl(request.getSenderImageUrl())
                .build();

        MessageEntity message = MessageEntity.builder()
                .conversationId(request.getConversationId())
                .sender(sender)
                .type("notification")
                .content(request.getContent())
                .createdAt(LocalDateTime.now())
                .build();

        MessageEntity savedMessage = messageRepository.save(message);

        MessageResponse response = modelMapper.map(savedMessage, MessageResponse.class);

        // Broadcast cho tất cả client đã subscribe conversation
        messagingTemplate.convertAndSend(
                "/topic/conversations/" + request.getConversationId(),
                response
        );

        updateLastMessage(
                request.getConversationId(),
                sender,
                "notification",
                request.getContent(),
                savedMessage.getId(),
                savedMessage.getCreatedAt()
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

        // send it to members in conversation
        conversation.getMembers().forEach(member -> {
            String destination = "/topic/conversations/user/" + member.getUserId();
            messagingTemplate.convertAndSend(destination, conversation);
        });
    }

    @Override
    public void createCallMessage(String conversationId,
                                  String senderId,
                                  String senderFullName,
                                  String senderImageUrl,
                                  String callType) {
        MemberEntity sender = MemberEntity.builder()
                .userId(senderId)
                .fullName(senderFullName)
                .imageUrl(senderImageUrl)
                .build();

        // Set content for the call message
        String content = callType.equalsIgnoreCase("video")
                ? "Video call"
                : "Audio call";

        MessageEntity message = MessageEntity.builder()
                .conversationId(conversationId)
                .sender(sender)
                .type(callType + "_call") // "video_call" or "audio_call"
                .content(content)
                .createdAt(LocalDateTime.now())
                .build();

        MessageEntity saved = messageRepository.save(message);
        MessageResponse response = modelMapper.map(saved, MessageResponse.class);

        // Broadcast to all clients subscribed to the conversation
        messagingTemplate.convertAndSend("/topic/conversations/" + conversationId, response);

        updateLastMessage(
                conversationId,
                sender,
                callType + "_call",
                content,
                saved.getId(),
                saved.getCreatedAt()
        );

        ResponseEntity.ok(response);
    }
    @Override
    public ResponseEntity<List<MessageResponse>> searchMessages(
            String conversationId,
            String keyword,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(page, size);

        List<MessageResponse> results = messageRepository
                .findByConversationIdAndTypeAndContentContainingIgnoreCaseOrderByCreatedAtDesc(
                        conversationId,
                        "text",
                        keyword,
                        pageable
                )
                .getContent()
                .stream()
                .map(m -> modelMapper.map(m, MessageResponse.class))
                .collect(Collectors.toList());

        return ResponseEntity.ok(results);
    }
    @Override
    public ResponseEntity<List<MessageResponse>> getMessageContext(
            String conversationId,
            String messageId,
            int before,
            int after
    ) {
        MessageEntity pivot = mongoTemplate.findById(messageId, MessageEntity.class);
        if (pivot == null) return ResponseEntity.ok(List.of());

        LocalDateTime pivotTime = pivot.getCreatedAt();

        // BEFORE: lấy những message có createdAt < pivotTime, sort DESC, limit = before
        Query beforeQuery = new Query(
                Criteria.where("conversationId").is(conversationId)
                        .and("createdAt").lt(pivotTime)
        )
                .with(Sort.by(Sort.Direction.DESC, "createdAt"))
                .limit(before);

        List<MessageEntity> beforeMessages = mongoTemplate.find(beforeQuery, MessageEntity.class);
        // đảo về thứ tự tăng dần để FE render từ cũ -> mới
        beforeMessages.sort((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()));

        // AFTER: lấy những message có createdAt > pivotTime, sort ASC, limit = after
        Query afterQuery = new Query(
                Criteria.where("conversationId").is(conversationId)
                        .and("createdAt").gt(pivotTime)
        )
                .with(Sort.by(Sort.Direction.ASC, "createdAt"))
                .limit(after);

        List<MessageEntity> afterMessages = mongoTemplate.find(afterQuery, MessageEntity.class);

        // Map sang DTO và gộp: before + pivot + after
        List<MessageResponse> result = new ArrayList<>();

        result.addAll(beforeMessages.stream()
                .map(m -> modelMapper.map(m, MessageResponse.class))
                .collect(Collectors.toList()));

        result.add(modelMapper.map(pivot, MessageResponse.class));

        result.addAll(afterMessages.stream()
                .map(m -> modelMapper.map(m, MessageResponse.class))
                .collect(Collectors.toList()));

        return ResponseEntity.ok(result);
    }

    @Override
    public ResponseEntity<List<MessageResponse>> getOldMessages(
            String conversationId,
            String beforeMessageId,
            int limit
    ) {
        MessageEntity pivot = mongoTemplate.findById(beforeMessageId, MessageEntity.class);
        if (pivot == null) return ResponseEntity.ok(List.of());

        Query query = new Query(
                Criteria.where("conversationId").is(conversationId)
                        .and("createdAt").lt(pivot.getCreatedAt())
        )
                .with(Sort.by(Sort.Direction.DESC, "createdAt"))
                .limit(limit);

        List<MessageEntity> messages = mongoTemplate.find(query, MessageEntity.class);

        // Đảo ngược để trả theo thứ tự thời gian tăng dần (cũ -> mới)
        messages.sort((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()));

        List<MessageResponse> response = messages.stream()
                .map(m -> modelMapper.map(m, MessageResponse.class))
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @Override
    public ResponseEntity<List<MessageResponse>> getNewMessages(
            String conversationId,
            String afterMessageId,
            int limit
    ) {
        MessageEntity pivot = mongoTemplate.findById(afterMessageId, MessageEntity.class);
        if (pivot == null) return ResponseEntity.ok(List.of());

        Query query = new Query(
                Criteria.where("conversationId").is(conversationId)
                        .and("createdAt").gt(pivot.getCreatedAt())
        )
                .with(Sort.by(Sort.Direction.ASC, "createdAt"))
                .limit(limit);

        List<MessageEntity> messages = mongoTemplate.find(query, MessageEntity.class);

        List<MessageResponse> response = messages.stream()
                .map(m -> modelMapper.map(m, MessageResponse.class))
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }
}
