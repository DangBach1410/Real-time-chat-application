package greenwich.chatapp.chatservice.feignclient;

import greenwich.chatapp.chatservice.dto.request.SendNotificationRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;

@FeignClient(name = "notification-service", url = "${notification.service.url}")
public interface NotificationServiceClient {
    @PostMapping(value = "/api/v1/notifications/send")
    ResponseEntity<?> sendNotification(SendNotificationRequest request);
}
