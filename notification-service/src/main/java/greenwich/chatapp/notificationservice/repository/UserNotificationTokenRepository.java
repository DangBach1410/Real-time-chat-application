package greenwich.chatapp.notificationservice.repository;

import greenwich.chatapp.notificationservice.entity.UserNotificationToken;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface UserNotificationTokenRepository extends MongoRepository<UserNotificationToken, String> {
    Optional<UserNotificationToken> findByUserId(String userId);

    List<UserNotificationToken> findByUserIdIn(List<String> userIds);
}
