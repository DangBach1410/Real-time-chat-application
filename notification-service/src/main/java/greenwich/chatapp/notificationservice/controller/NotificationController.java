package greenwich.chatapp.notificationservice.controller;

import greenwich.chatapp.notificationservice.dto.request.SaveTokenRequest;
import greenwich.chatapp.notificationservice.dto.request.SendNotificationRequest;
import greenwich.chatapp.notificationservice.dto.response.ApiResponse;
import greenwich.chatapp.notificationservice.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @PostMapping("/token")
    public ResponseEntity<ApiResponse> saveToken(
            @RequestBody SaveTokenRequest request) {

        notificationService.saveToken(request);
        return ResponseEntity.ok(
                new ApiResponse(true, "Token saved")
        );
    }

    @PostMapping("/send")
    public ResponseEntity<ApiResponse> sendNotification(
            @RequestBody SendNotificationRequest request) {

        notificationService.sendNotification(request);
        return ResponseEntity.ok(
                new ApiResponse(true, "Notification sent")
        );
    }
}

