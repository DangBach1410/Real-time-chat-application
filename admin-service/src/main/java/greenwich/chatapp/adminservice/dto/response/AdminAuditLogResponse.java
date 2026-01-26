package greenwich.chatapp.adminservice.dto.response;

import greenwich.chatapp.adminservice.enums.AdminAction;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAuditLogResponse {

    private String id;

    // Admin info
    private String adminId;

    // Action
    private AdminAction action;

    // Target user info
    private String targetUserId;
    private String targetUserEmail;
    private String targetUserName;

    // Result
    private String description;
    private boolean success;

    // Time
    private LocalDateTime createdAt;
}
