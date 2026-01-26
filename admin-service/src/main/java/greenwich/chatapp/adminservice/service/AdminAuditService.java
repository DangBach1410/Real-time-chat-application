package greenwich.chatapp.adminservice.service;

import greenwich.chatapp.adminservice.enums.AdminAction;
import greenwich.chatapp.adminservice.entity.AdminAuditLog;
import greenwich.chatapp.adminservice.repository.AdminAuditLogRepository;
import lombok.*;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AdminAuditService {

    private final AdminAuditLogRepository auditLogRepository;

    public void log(
            String adminId,
            AdminAction action,
            String targetUserId,
            String targetUserEmail,
            String targetUserName,
            String description,
            boolean success
    ) {
        auditLogRepository.save(
                AdminAuditLog.builder()
                        .adminId(adminId)
                        .action(action)
                        .targetUserId(targetUserId)
                        .targetUserEmail(targetUserEmail)
                        .targetUserName(targetUserName)
                        .description(description)
                        .success(success)
                        .createdAt(LocalDateTime.now())
                        .build()
        );
    }
}

