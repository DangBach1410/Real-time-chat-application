package greenwich.chatapp.notificationservice.service;

import greenwich.chatapp.notificationservice.service.ExpoPushClient;
import greenwich.chatapp.notificationservice.dto.request.SaveTokenRequest;
import greenwich.chatapp.notificationservice.dto.request.SendNotificationRequest;
import greenwich.chatapp.notificationservice.entity.UserNotificationToken;
import greenwich.chatapp.notificationservice.repository.UserNotificationTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final UserNotificationTokenRepository tokenRepository;
    private final ExpoPushClient expoPushClient;

    /* ========== SAVE TOKEN ========== */
    public void saveToken(SaveTokenRequest request) {

        if (!request.getExpoPushToken().startsWith("ExponentPushToken")) {
            log.warn("Invalid Expo token: {}", request.getExpoPushToken());
            return;
        }

        UserNotificationToken token =
                tokenRepository.findByUserId(request.getUserId())
                        .map(existing -> {
                            existing.setExpoPushToken(request.getExpoPushToken());
                            return existing;
                        })
                        .orElse(
                                UserNotificationToken.builder()
                                        .userId(request.getUserId())
                                        .expoPushToken(request.getExpoPushToken())
                                        .build()
                        );

        tokenRepository.save(token);
    }

    /* ========== SEND NOTIFICATION ========== */
    public void sendNotification(SendNotificationRequest request) {

        List<UserNotificationToken> tokens =
                tokenRepository.findByUserIdIn(request.getUserIds());

        if (tokens.isEmpty()) {
            log.warn("No expo tokens found for users {}", request.getUserIds());
            return;
        }

        tokens.forEach(token -> {
            try {
                expoPushClient.send(
                        token.getExpoPushToken(),
                        request.getTitle(),
                        request.getBody(),
                        request.getData()
                );
            } catch (Exception e) {
                log.error("Failed to push notification to userId={}",
                        token.getUserId(), e);
            }
        });
    }
}
