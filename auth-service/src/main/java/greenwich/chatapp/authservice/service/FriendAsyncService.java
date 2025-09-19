package greenwich.chatapp.authservice.service;

import greenwich.chatapp.authservice.entity.UserEntity;
import greenwich.chatapp.authservice.util.UnicodeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FriendAsyncService {
    private final MongoTemplate mongoTemplate;

    public void updateFriendsInOthers(String userId, String fullName, String imageUrl) {
        Query query = new Query(Criteria.where("friends.id").is(userId));
        Update update = new Update()
                .set("friends.$.fullName", fullName)
                .set("friends.$.imageUrl", imageUrl)
                .set("friends.$.searchFullName", UnicodeUtils.toSearchable(fullName));

        mongoTemplate.updateMulti(query, update, UserEntity.class);
    }

    public void updateFriendRequestsInOthers(String userId, String fullName, String imageUrl) {
        Query query = new Query(Criteria.where("friendRequests.senderId").is(userId));
        Update update = new Update()
                .set("friendRequests.$.senderFullName", fullName)
                .set("friendRequests.$.senderImageUrl", imageUrl);

        mongoTemplate.updateMulti(query, update, UserEntity.class);
    }

    @Async("taskExecutor")
    public void updateFriendsAndRequestsInBackground(String userId, String fullName, String imageUrl) {
        updateFriendRequestsInOthers(userId, fullName, imageUrl);
        updateFriendsInOthers(userId, fullName, imageUrl);
    }
}
