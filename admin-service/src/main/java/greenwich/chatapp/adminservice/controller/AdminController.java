package greenwich.chatapp.adminservice.controller;

import greenwich.chatapp.adminservice.dto.response.AdminAuditLogResponse;
import greenwich.chatapp.adminservice.dto.response.SearchUserResponse;
import greenwich.chatapp.adminservice.dto.response.UserResponse;
import greenwich.chatapp.adminservice.entity.AdminAuditLog;
import greenwich.chatapp.adminservice.enums.AdminAction;
import greenwich.chatapp.adminservice.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin")
public class AdminController {
    private final AdminService adminService;
    @PutMapping("/users/{id}/ban")
    public ResponseEntity<UserResponse> banUser(@PathVariable String id,@RequestParam String adminId) {
        return ResponseEntity.ok(adminService.banUser(id, adminId));
    }

    @PutMapping("/users/{id}/unban")
    public ResponseEntity<UserResponse> unbanUser(@PathVariable String id,@RequestParam String adminId) {
        return ResponseEntity.ok(adminService.unbanUser(id, adminId));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<UserResponse> deleteUser(@PathVariable String id,@RequestParam String adminId) {
        return ResponseEntity.ok(adminService.deleteUser(id, adminId));
    }

    @GetMapping("/users/search")
    public ResponseEntity<List<SearchUserResponse>> searchUsers(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(adminService.adminSearchUsers(keyword, page, size));
    }
    @GetMapping("/audit-logs")
    public ResponseEntity<Page<AdminAuditLogResponse>> getAuditLogs(
            @RequestParam(required = false) AdminAction action,
            @RequestParam(defaultValue = "") String adminId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(adminService.getAuditLogs(action, adminId, page, size));
    }
}
