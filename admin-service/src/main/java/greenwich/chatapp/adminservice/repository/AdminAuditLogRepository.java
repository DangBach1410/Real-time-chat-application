package greenwich.chatapp.adminservice.repository;

import greenwich.chatapp.adminservice.entity.AdminAuditLog;
import greenwich.chatapp.adminservice.enums.AdminAction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AdminAuditLogRepository extends MongoRepository<AdminAuditLog, String> {
    Page<AdminAuditLog> findByActionAndAdminIdOrderByCreatedAtDesc(
            AdminAction action, String adminId, Pageable pageable
    );
    Page<AdminAuditLog> findByActionOrderByCreatedAtDesc(AdminAction action, Pageable pageable);
    Page<AdminAuditLog> findByAdminIdOrderByCreatedAtDesc(String adminId, Pageable pageable);
    Page<AdminAuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
