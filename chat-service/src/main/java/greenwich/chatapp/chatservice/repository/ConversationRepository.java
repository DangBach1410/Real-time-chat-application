package greenwich.chatapp.chatservice.repository;

import greenwich.chatapp.chatservice.entity.ConversationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.Optional;

public interface ConversationRepository extends MongoRepository<ConversationEntity, String> {
    Page<ConversationEntity> findByMembersUserIdOrderByLastMessageAtDesc(String userId, Pageable pageable);
    @Query("{ 'type': 'private', 'members.userId': { $all: [?0, ?1] }, 'members': { $size: 2 } }")
    Optional<ConversationEntity> findPrivateConversation(String userId1, String userId2);
}
