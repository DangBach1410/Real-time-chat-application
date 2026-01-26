package greenwich.chatapp.adminservice.entity;

import greenwich.chatapp.adminservice.enums.AdminAction;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "admin_audit_logs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAuditLog {

    @Id
    private String id;

    private String adminId;
    private AdminAction action; // BAN, UNBAN, DELETE
    private String targetUserId;
    private String targetUserEmail;
    private String targetUserName;
    private String description;
    private boolean success;
    private LocalDateTime createdAt;
}
