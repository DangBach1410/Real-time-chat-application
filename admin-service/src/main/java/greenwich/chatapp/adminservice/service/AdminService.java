package greenwich.chatapp.adminservice.service;

import greenwich.chatapp.adminservice.dto.response.AdminAuditLogResponse;
import greenwich.chatapp.adminservice.dto.response.SearchUserResponse;
import greenwich.chatapp.adminservice.dto.response.UserResponse;
import greenwich.chatapp.adminservice.entity.AdminAuditLog;
import greenwich.chatapp.adminservice.entity.UserEntity;
import greenwich.chatapp.adminservice.enums.AdminAction;
import greenwich.chatapp.adminservice.repository.AdminAuditLogRepository;
import greenwich.chatapp.adminservice.repository.UserRepository;
import greenwich.chatapp.adminservice.util.UnicodeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import greenwich.chatapp.adminservice.enums.Role;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AdminService {

private static final String USER_NOT_FOUND = "User not found";
    private static final String ACTION_NOT_ALLOWED = "Action not allowed: Cannot perform this action on an Admin account";

    private final UserRepository userRepository;
    private final AdminAuditLogRepository auditLogRepository;
    private final AdminAuditService auditService;

    public UserResponse banUser(String id, String adminId) {
        Optional<UserEntity> optionalUser = userRepository.findById(id);

        if (optionalUser.isEmpty()) {
            return buildNotFoundResponse(adminId, AdminAction.BAN_USER, id);
        }

        UserEntity user = optionalUser.get();

        // CHẶN NẾU TARGET LÀ ADMIN
        if (user.getRole() == Role.ADMIN) {
            return buildActionNotAllowedResponse(adminId, AdminAction.BAN_USER, user);
        }

        user.setBanned(true);
        userRepository.save(user);

        auditService.log(adminId, AdminAction.BAN_USER, user.getId(), user.getEmail(), user.getFullName(), "Ban user successfully", true);

        return UserResponse.builder()
                .status(HttpStatus.OK.value())
                .message("User banned successfully")
                .build();
    }

    public UserResponse unbanUser(String id, String adminId) {
        Optional<UserEntity> optionalUser = userRepository.findById(id);

        if (optionalUser.isEmpty()) {
            return buildNotFoundResponse(adminId, AdminAction.UNBAN_USER, id);
        }

        UserEntity user = optionalUser.get();

        // CHẶN NẾU TARGET LÀ ADMIN
        if (user.getRole() == Role.ADMIN) {
            return buildActionNotAllowedResponse(adminId, AdminAction.UNBAN_USER, user);
        }

        user.setBanned(false);
        userRepository.save(user);

        auditService.log(adminId, AdminAction.UNBAN_USER, user.getId(), user.getEmail(), user.getFullName(), "Unban user successfully", true);

        return UserResponse.builder()
                .status(HttpStatus.OK.value())
                .message("User unbanned successfully")
                .build();
    }

    public UserResponse deleteUser(String id, String adminId) {
        Optional<UserEntity> optionalUser = userRepository.findById(id);

        if (optionalUser.isEmpty()) {
            return buildNotFoundResponse(adminId, AdminAction.DELETE_USER, id);
        }

        UserEntity user = optionalUser.get();

        // CHẶN NẾU TARGET LÀ ADMIN
        if (user.getRole() == Role.ADMIN) {
            return buildActionNotAllowedResponse(adminId, AdminAction.DELETE_USER, user);
        }

        userRepository.deleteById(id);

        auditService.log(adminId, AdminAction.DELETE_USER, user.getId(), user.getEmail(), user.getFullName(), "Delete user successfully", true);

        return UserResponse.builder()
                .status(HttpStatus.OK.value())
                .message("User deleted successfully")
                .build();
    }

    public List<SearchUserResponse> adminSearchUsers(String keyword, int page, int size) {
        // 1. Try search by ID first
        Optional<UserEntity> userById = userRepository.findById(keyword);
        
        // Chỉ trả về nếu tìm thấy VÀ không phải Admin
        if (userById.isPresent() && userById.get().getRole() != Role.ADMIN) {
            UserEntity user = userById.get();
            return List.of(mapToSearchResponse(user));
        }

        // 2. Fallback to text search
        String normalizedKeyword = UnicodeUtils.toSearchable(keyword);
        Pageable pageable = Pageable.ofSize(size).withPage(page);

        Page<UserEntity> userEntities =
                userRepository.findDistinctByFullNameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrSearchFullNameContainingIgnoreCase(
                        keyword, keyword, normalizedKeyword, pageable
                );

        // Lọc bỏ ADMIN ra khỏi stream kết quả
        return userEntities.stream()
                .filter(user -> user.getRole() != Role.ADMIN) 
                .map(this::mapToSearchResponse)
                .toList();
    }

    // --- Helper Methods để code sạch hơn ---

    private SearchUserResponse mapToSearchResponse(UserEntity user) {
        return SearchUserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .imageUrl(user.getImageUrl())
                .email(user.getEmail())
                .status(user.isBanned() ? "BANNED" : "ACTIVE")
                .build();
    }

    private UserResponse buildNotFoundResponse(String adminId, AdminAction action, String targetId) {
        auditService.log(adminId, action, targetId, null, null, USER_NOT_FOUND, false);
        return UserResponse.builder()
                .status(HttpStatus.NOT_FOUND.value())
                .message(USER_NOT_FOUND)
                .build();
    }

    private UserResponse buildActionNotAllowedResponse(String adminId, AdminAction action, UserEntity targetUser) {
        auditService.log(adminId, action, targetUser.getId(), targetUser.getEmail(), targetUser.getFullName(), ACTION_NOT_ALLOWED, false);
        return UserResponse.builder()
                .status(HttpStatus.FORBIDDEN.value())
                .message(ACTION_NOT_ALLOWED)
                .build();
    }

    public Page<AdminAuditLogResponse> getAuditLogs(AdminAction action, String adminId, int page, int size) {
        Pageable pageable = Pageable.ofSize(size).withPage(page);

        Page<AdminAuditLog> auditLogs;

        if (action != null && !adminId.isEmpty()) {
            auditLogs = auditLogRepository.findByActionAndAdminIdOrderByCreatedAtDesc(action, adminId, pageable);
        } else if (action != null) {
            auditLogs = auditLogRepository.findByActionOrderByCreatedAtDesc(action, pageable);
        } else if (!adminId.isEmpty()) {
            auditLogs = auditLogRepository.findByAdminIdOrderByCreatedAtDesc(adminId, pageable);
        } else {
            auditLogs = auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
        }

        return auditLogs.map(log -> AdminAuditLogResponse.builder()
                .id(log.getId())
                .adminId(log.getAdminId())
                .action(log.getAction())
                .targetUserId(log.getTargetUserId())
                .targetUserEmail(log.getTargetUserEmail())
                .targetUserName(log.getTargetUserName())
                .description(log.getDescription())
                .success(log.isSuccess())
                .createdAt(log.getCreatedAt())
                .build());
    }
}


