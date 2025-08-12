package greenwich.chatapp.chatservice.repository;

import greenwich.chatapp.chatservice.entity.MessageEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MessageRepository extends MongoRepository<MessageEntity, String> {
    Page<MessageEntity> findByConversationIdOrderByCreatedAtDesc(String conversationId, Pageable pageable);
}
