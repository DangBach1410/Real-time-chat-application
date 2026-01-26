package greenwich.chatapp.adminservice.repository;

import greenwich.chatapp.adminservice.entity.AdminAuditLog;
import greenwich.chatapp.adminservice.enums.AdminAction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AdminAuditLogRepository extends MongoRepository<AdminAuditLog, String> {
    Page<AdminAuditLog> findByActionAndAdminId(
            AdminAction action, String adminId, Pageable pageable
    );
    Page<AdminAuditLog> findByAction(AdminAction action, Pageable pageable);
    Page<AdminAuditLog> findByAdminId(String adminId, Pageable pageable);
}
