package greenwich.chatapp.chatservice.service.impl;

import greenwich.chatapp.chatservice.dto.request.MessageCreateRequest;
import greenwich.chatapp.chatservice.dto.response.MessageResponse;
import greenwich.chatapp.chatservice.entity.ConversationEntity;
import greenwich.chatapp.chatservice.entity.LastMessageEntity;
import greenwich.chatapp.chatservice.entity.MemberEntity;
import greenwich.chatapp.chatservice.entity.MessageEntity;
import greenwich.chatapp.chatservice.repository.ConversationRepository;
import greenwich.chatapp.chatservice.repository.MessageRepository;
import greenwich.chatapp.chatservice.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageServiceImpl implements MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final ModelMapper modelMapper;

    @Override
    public ResponseEntity<MessageResponse> createMessage(MessageCreateRequest request) {
        // Tạo message mới
        MemberEntity sender = MemberEntity.builder()
                .userId(request.getSenderId())
                .displayName(request.getSenderName())
                .avatar(request.getSenderAvatar())
                .build();

        MessageEntity message = MessageEntity.builder()
                .conversationId(request.getConversationId())
                .sender(sender)
                .type(request.getType())
                .content(request.getContent())
                .createdAt(LocalDateTime.now())
                .build();

        MessageEntity savedMessage = messageRepository.save(message);

        // Cập nhật lastMessage cho conversation
        ConversationEntity conversation = conversationRepository.findById(request.getConversationId())
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        LastMessageEntity lastMessage = LastMessageEntity.builder()
                .messageId(savedMessage.getId())
                .sender(sender)
                .type(savedMessage.getType())
                .content(savedMessage.getContent())
                .createdAt(savedMessage.getCreatedAt())
                .build();

        conversation.setLastMessage(lastMessage);
        conversation.setLastMessageAt(savedMessage.getCreatedAt());
        conversationRepository.save(conversation);

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
}