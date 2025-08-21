package greenwich.chatapp.chatservice.service.impl;

import greenwich.chatapp.chatservice.dto.request.ConversationCreateRequest;
import greenwich.chatapp.chatservice.dto.request.ConversationAddMemberRequest;
import greenwich.chatapp.chatservice.dto.response.ConversationResponse;
import greenwich.chatapp.chatservice.dto.response.MemberResponse;
import greenwich.chatapp.chatservice.entity.ConversationEntity;
import greenwich.chatapp.chatservice.entity.MemberEntity;
import greenwich.chatapp.chatservice.repository.ConversationRepository;
import greenwich.chatapp.chatservice.service.ConversationService;
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
public class ConversationServiceImpl implements ConversationService {

    private final ConversationRepository conversationRepository;
    private final ModelMapper modelMapper;

    @Override
    public ResponseEntity<ConversationResponse> createConversation(ConversationCreateRequest request) {
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
        return ResponseEntity.ok(modelMapper.map(saved, ConversationResponse.class));
    }

    @Override
    public ResponseEntity<ConversationResponse> addMembers(String conversationId, ConversationAddMemberRequest request) {
        ConversationEntity conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

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
            }
        }

        ConversationEntity updated = conversationRepository.save(conversation);
        return ResponseEntity.ok(modelMapper.map(updated, ConversationResponse.class));
    }

    @Override
    public ResponseEntity<ConversationResponse> removeMember(String conversationId, String userId) {
        ConversationEntity conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        boolean removed = conversation.getMembers()
                .removeIf(member -> member.getUserId().equals(userId));

        if (!removed) {
            throw new RuntimeException("Member not found in this conversation");
        }

        ConversationEntity updated = conversationRepository.save(conversation);
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
}
