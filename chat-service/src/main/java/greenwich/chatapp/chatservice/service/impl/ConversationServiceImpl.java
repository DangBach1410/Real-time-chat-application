package greenwich.chatapp.chatservice.service.impl;

import greenwich.chatapp.chatservice.dto.request.ConversationCreateRequest;
import greenwich.chatapp.chatservice.dto.request.ConversationAddMemberRequest;
import greenwich.chatapp.chatservice.dto.request.MessageCreateRequest;
import greenwich.chatapp.chatservice.dto.response.ConversationResponse;
import greenwich.chatapp.chatservice.dto.response.MemberResponse;
import greenwich.chatapp.chatservice.dto.response.MessageResponse;
import greenwich.chatapp.chatservice.entity.ConversationEntity;
import greenwich.chatapp.chatservice.entity.MemberEntity;
import greenwich.chatapp.chatservice.entity.MessageEntity;
import greenwich.chatapp.chatservice.feignclient.MediaServiceClient;
import greenwich.chatapp.chatservice.repository.ConversationRepository;
import greenwich.chatapp.chatservice.service.ConversationService;
import greenwich.chatapp.chatservice.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConversationServiceImpl implements ConversationService {

    private final ConversationRepository conversationRepository;
    private final MessageService messageService;
    private final ModelMapper modelMapper;
    private final MongoTemplate mongoTemplate;
    private final MediaServiceClient mediaServiceClient;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Async("taskExecutor")
    public void updateMemberInfoInConversations(String userId, String fullName, String imageUrl) {
        Query query = new Query(Criteria.where("members.userId").is(userId));
        Update update = new Update()
                .set("members.$[m].fullName", fullName)
                .set("members.$[m].imageUrl", imageUrl)
                .filterArray(Criteria.where("m.userId").is(userId));

        mongoTemplate.updateMulti(query, update, ConversationEntity.class);

        // 2. Update lastMessage.sender bằng batch Java
        List<ConversationEntity> conversations = mongoTemplate.find(query, ConversationEntity.class);

        for (ConversationEntity conversation : conversations) {
            boolean modified = false;

            if (conversation.getLastMessage() != null &&
                    userId.equals(conversation.getLastMessage().getSender().getUserId())) {
                conversation.getLastMessage().getSender().setFullName(fullName);
                conversation.getLastMessage().getSender().setImageUrl(imageUrl);
                modified = true;
            }

            if (modified) {
                mongoTemplate.save(conversation);
            }
        }
    }

    @Override
    public ResponseEntity<ConversationResponse> createConversation(ConversationCreateRequest request) {
        if ("private".equalsIgnoreCase(request.getType()) && request.getMembers().size() == 2) {
            String userId1 = request.getMembers().get(0).getUserId();
            String userId2 = request.getMembers().get(1).getUserId();

            Optional<ConversationEntity> existing = conversationRepository.findPrivateConversation(userId1, userId2);
            if (existing.isPresent()) {
                return ResponseEntity.ok(modelMapper.map(existing.get(), ConversationResponse.class));
            }
        }

        ConversationEntity conversation = ConversationEntity.builder()
                .type(request.getType())
                .name(request.getName())
                .members(request.getMembers().stream().map(m ->
                        MemberEntity.builder()
                                .userId(m.getUserId())
                                .fullName(m.getFullName())
                                .imageUrl(m.getImageUrl())
                                .role(m.getRole())
                                .joinedAt(LocalDateTime.now())
                                .build()
                ).collect(Collectors.toList()))
                .createdAt(LocalDateTime.now())
                .build();

        ConversationEntity saved = conversationRepository.save(conversation);
        // Người tạo nhóm là member đầu tiên
        MemberEntity creator = saved.getMembers().get(0);

        // Thông báo người tạo nhóm
        MessageCreateRequest createMsg = MessageCreateRequest.builder()
                .conversationId(saved.getId())
                .senderId(creator.getUserId())
                .senderFullName(creator.getFullName())
                .senderImageUrl(creator.getImageUrl())
                .content("created the group")
                .build();

        messageService.createNotificationMessage(createMsg);

        // Thông báo các thành viên khác đã tham gia
        saved.getMembers().stream().skip(1).forEach(member -> {
            MessageCreateRequest joinMsg = MessageCreateRequest.builder()
                    .conversationId(saved.getId())
                    .senderId(member.getUserId())
                    .senderFullName(member.getFullName())
                    .senderImageUrl(member.getImageUrl())
                    .content("joined the group")
                    .build();
            messageService.createNotificationMessage(joinMsg);
        });
        return ResponseEntity.ok(modelMapper.map(saved, ConversationResponse.class));
    }

    @Override
    public ResponseEntity<ConversationResponse> updateImageOfConversation(String conversationId, String userId, String userFullname, MultipartFile file) {
        ConversationEntity conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        String imageUrl = mediaServiceClient.uploadFiles(List.of(file)).get(0).getUrl();

        if (imageUrl != null && !imageUrl.isEmpty()) {
            conversation.setImageUrl(imageUrl);
            ConversationEntity updated = conversationRepository.save(conversation);

            // 🔥 Gửi notification message qua messageService
            MessageCreateRequest notificationRequest = MessageCreateRequest.builder()
                    .conversationId(conversationId)
                    .senderId(userId)
                    .senderFullName(userFullname)
                    .senderImageUrl(null) // có thể fetch từ userService nếu cần
                    .type("notification")
                    .content("updated the group photo")
                    .build();

            messageService.createNotificationMessage(notificationRequest);

            return ResponseEntity.ok(modelMapper.map(updated, ConversationResponse.class));
        } else {
            throw new RuntimeException("Failed to upload image");
        }
    }

    @Override
    public ResponseEntity<ConversationResponse> updateNameOfConversation(String conversationId, String userId, String userFullname, String name) {
        ConversationEntity conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        if (name != null && !name.isEmpty()) {
            conversation.setName(name);
            ConversationEntity updated = conversationRepository.save(conversation);

            // 🔥 Gửi notification message qua messageService
            MessageCreateRequest notificationRequest = MessageCreateRequest.builder()
                    .conversationId(conversationId)
                    .senderId(userId)
                    .senderFullName(userFullname)
                    .senderImageUrl(null) // có thể fetch user
                    .type("notification")
                    .content("changed the group name to " + name)
                    .build();

            messageService.createNotificationMessage(notificationRequest);
            return ResponseEntity.ok(modelMapper.map(updated, ConversationResponse.class));
        } else {
            throw new RuntimeException("Name cannot be empty");
        }
    }

    @Override
    public ResponseEntity<ConversationResponse> addMembers(String conversationId, ConversationAddMemberRequest request) {
        ConversationEntity conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        List<String> newlyAddedUserIds = new ArrayList<>();
        if (request.getMembers() != null && !request.getMembers().isEmpty()) {
            for (ConversationAddMemberRequest.MemberRequest m : request.getMembers()) {
                MemberEntity newMember = MemberEntity.builder()
                        .userId(m.getUserId())
                        .fullName(m.getFullName())
                        .imageUrl(m.getImageUrl())
                        .role(m.getRole())
                        .joinedAt(LocalDateTime.now())
                        .build();
                conversation.getMembers().add(newMember);
                newlyAddedUserIds.add(m.getUserId());

                // 🔥 Gửi notification message cho việc thêm thành viên
                MessageCreateRequest notificationRequest = MessageCreateRequest.builder()
                        .conversationId(conversationId)
                        .senderId(m.getUserId())
                        .senderFullName(m.getFullName())
                        .senderImageUrl(m.getImageUrl())
                        .type("notification")
                        .content("joined the conversation")
                        .build();

                messageService.createNotificationMessage(notificationRequest);
            }
        }

        // lấy lại conversation mới nhất sau khi cập nhật last message
        ConversationEntity newConversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        newConversation.setMembers(conversation.getMembers());
        ConversationEntity updated = conversationRepository.save(newConversation);
        // Gửi cập nhật conversation cho các thành viên mới được thêm
        for (String userId : newlyAddedUserIds) {
            String destination = "/topic/conversations/user/" + userId;
            messagingTemplate.convertAndSend(destination, updated); // gửi conversation đã cập nhật
        }
        return ResponseEntity.ok(modelMapper.map(updated, ConversationResponse.class));
    }

    @Override
    public ResponseEntity<ConversationResponse> removeMember(String conversationId, String userId) {
        ConversationEntity conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        MemberEntity removedMember = conversation.getMembers().stream()
                .filter(member -> member.getUserId().equals(userId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Member not found in this conversation"));

        conversation.getMembers().remove(removedMember);

        ConversationEntity updated = conversationRepository.save(conversation);

        // Gửi notification message cho việc rời nhóm
        MessageCreateRequest notificationRequest = MessageCreateRequest.builder()
                .conversationId(conversationId)
                .senderId(userId)
                .senderFullName(removedMember.getFullName())
                .senderImageUrl(removedMember.getImageUrl())
                .type("notification")
                .content("left the conversation")
                .build();

        messageService.createNotificationMessage(notificationRequest);

        // Gửi cập nhật conversation cho thành viên bị xoá
        ConversationEntity newConversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        String destination = "/topic/conversations/user/" + userId;
        messagingTemplate.convertAndSend(destination, newConversation);

        return ResponseEntity.ok(modelMapper.map(updated, ConversationResponse.class));
    }

    @Override
    public ResponseEntity<List<ConversationResponse>> getUserConversations(String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        List<ConversationResponse> conversations = conversationRepository
                .findByMembersUserIdOrderByLastMessageAtDesc(userId, pageable)
                .getContent()
                .stream()
                .map(c -> modelMapper.map(c, ConversationResponse.class))
                .collect(Collectors.toList());
        return ResponseEntity.ok(conversations);
    }
    @Override
    public ResponseEntity<List<MemberResponse>> getMembers(String conversationId) {
        ConversationEntity conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        List<MemberResponse> members = conversation.getMembers().stream()
                .map(m -> modelMapper.map(m, MemberResponse.class))
                .collect(Collectors.toList());

        return ResponseEntity.ok(members);
    }

    @Override
    public ResponseEntity<List<MessageResponse>> getMedia(String conversationId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        Query query = new Query()
                .addCriteria(Criteria.where("conversationId").is(conversationId)
                        .and("type").is("media")
                        .and("content").regex("\"mediaType\"\\s*:\\s*\"(image|video)\""))
                .with(pageable)
                .with(Sort.by(Sort.Direction.DESC, "createdAt"));

        List<MessageEntity> messages = mongoTemplate.find(query, MessageEntity.class);

        List<MessageResponse> responses = messages.stream()
                .map(m -> modelMapper.map(m, MessageResponse.class))
                .toList();

        return ResponseEntity.ok(responses);
    }

    @Override
    public ResponseEntity<List<MessageResponse>> getFiles(String conversationId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        Query query = new Query()
                .addCriteria(Criteria.where("conversationId").is(conversationId)
                        .and("type").is("media")
                        .and("content").regex("\"mediaType\"\\s*:\\s*\"file\""))
                .with(pageable)
                .with(Sort.by(Sort.Direction.DESC, "createdAt"));

        List<MessageEntity> messages = mongoTemplate.find(query, MessageEntity.class);

        List<MessageResponse> responses = messages.stream()
                .map(m -> modelMapper.map(m, MessageResponse.class))
                .toList();

        return ResponseEntity.ok(responses);
    }

    @Override
    public ResponseEntity<List<MessageResponse>> getLinks(String conversationId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        Query query = new Query()
                .addCriteria(Criteria.where("conversationId").is(conversationId)
                        .and("type").is("link"))
                .with(pageable)
                .with(Sort.by(Sort.Direction.DESC, "createdAt"));

        List<MessageEntity> messages = mongoTemplate.find(query, MessageEntity.class);

        List<MessageResponse> responses = messages.stream()
                .map(m -> modelMapper.map(m, MessageResponse.class))
                .toList();

        return ResponseEntity.ok(responses);
    }
    @Override
    public ConversationResponse getConversation(String conversationId) {
        ConversationEntity conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        return modelMapper.map(conversation, ConversationResponse.class);
    }

    @Override
    public ResponseEntity<ConversationResponse> getPrivateConversation(String currentUserId, String otherUserId) {
        Optional<ConversationEntity> conversation = conversationRepository.findPrivateConversation(currentUserId, otherUserId);

        if (conversation.isEmpty()) {
            throw new RuntimeException("Private conversation not found");
        }

        return ResponseEntity.ok(modelMapper.map(conversation.get(), ConversationResponse.class));
    }
}
