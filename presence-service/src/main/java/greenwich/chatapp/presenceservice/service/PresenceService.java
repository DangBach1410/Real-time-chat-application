package greenwich.chatapp.presenceservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.TimeUnit;

@Service
public class PresenceService {

    private final StringRedisTemplate redisTemplate;
    private final PresenceWebSocketService wsService;
    private final long ttlMinutes;

    public PresenceService(StringRedisTemplate redisTemplate,
                           PresenceWebSocketService wsService,
                           @Value("${presence.ttl-minutes}") long ttlMinutes) {
        this.redisTemplate = redisTemplate;
        this.wsService = wsService;
        this.ttlMinutes = ttlMinutes;
    }

    public void updatePresence(String userId) {
        long now = Instant.now().toEpochMilli();
        String key = "presence:" + userId;

        // Lưu vào Redis với TTL
        redisTemplate.opsForValue().set(key, String.valueOf(now), ttlMinutes, TimeUnit.MINUTES);

        // Push WebSocket event (chỉ userId + lastSeen)
        wsService.publishUpdate(userId, now);
    }
    public Long getLastSeen(String userId) {
        String key = "presence:" + userId;
        String value = redisTemplate.opsForValue().get(key);
        if (value == null) return null;
        return Long.parseLong(value);
    }
}
