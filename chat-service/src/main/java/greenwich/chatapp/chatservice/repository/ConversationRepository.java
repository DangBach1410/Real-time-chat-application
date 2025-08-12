package greenwich.chatapp.chatservice.repository;

import greenwich.chatapp.chatservice.entity.ConversationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ConversationRepository extends MongoRepository<ConversationEntity, String> {
    Page<ConversationEntity> findByMembersUserIdOrderByLastMessageAtDesc(String userId, Pageable pageable);
}
