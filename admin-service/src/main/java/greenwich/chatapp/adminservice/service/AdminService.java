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

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AdminService {

    private static final String USER_NOT_FOUND = "User not found";

    private final UserRepository userRepository;
    private final AdminAuditLogRepository auditLogRepository;
    private final AdminAuditService auditService;

    public UserResponse banUser(String id, String adminId) {

        Optional<UserEntity> optionalUser = userRepository.findById(id);

        if (optionalUser.isEmpty()) {
            auditService.log(
                    adminId,
                    AdminAction.BAN_USER,
                    id,
                    null,
                    null,
                    USER_NOT_FOUND,
                    false
            );

            return UserResponse.builder()
                    .status(HttpStatus.NOT_FOUND.value())
                    .message(USER_NOT_FOUND)
                    .build();
        }

        UserEntity user = optionalUser.get();
        user.setBanned(true);
        userRepository.save(user);

        auditService.log(
                adminId,
                AdminAction.BAN_USER,
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                "Ban user successfully",
                true
        );

        return UserResponse.builder()
                .status(HttpStatus.OK.value())
                .message("User banned successfully")
                .build();
    }

    public UserResponse unbanUser(String id, String adminId) {

        Optional<UserEntity> optionalUser = userRepository.findById(id);

        if (optionalUser.isEmpty()) {
            auditService.log(
                    adminId,
                    AdminAction.UNBAN_USER,
                    id,
                    null,
                    null,
                    USER_NOT_FOUND,
                    false
            );

            return UserResponse.builder()
                    .status(HttpStatus.NOT_FOUND.value())
                    .message(USER_NOT_FOUND)
                    .build();
        }

        UserEntity user = optionalUser.get();
        user.setBanned(false);
        userRepository.save(user);

        auditService.log(
                adminId,
                AdminAction.UNBAN_USER,
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                "Unban user successfully",
                true
        );

        return UserResponse.builder()
                .status(HttpStatus.OK.value())
                .message("User unbanned successfully")
                .build();
    }

    public UserResponse deleteUser(String id, String adminId) {

        Optional<UserEntity> optionalUser = userRepository.findById(id);

        if (optionalUser.isEmpty()) {
            auditService.log(
                    adminId,
                    AdminAction.DELETE_USER,
                    id,
                    null,
                    null,
                    USER_NOT_FOUND,
                    false
            );

            return UserResponse.builder()
                    .status(HttpStatus.NOT_FOUND.value())
                    .message(USER_NOT_FOUND)
                    .build();
        }

        UserEntity user = optionalUser.get();
        userRepository.deleteById(id);

        auditService.log(
                adminId,
                AdminAction.DELETE_USER,
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                "Delete user successfully",
                true
        );

        return UserResponse.builder()
                .status(HttpStatus.OK.value())
                .message("User deleted successfully")
                .build();
    }

    public List<SearchUserResponse> adminSearchUsers(String keyword, int page, int size) {
        // 1. Try search by ID first
        Optional<UserEntity> userById = userRepository.findById(keyword);
        if (userById.isPresent()) {
            UserEntity user = userById.get();
            return List.of(SearchUserResponse.builder()
                    .id(user.getId())
                    .fullName(user.getFullName())
                    .imageUrl(user.getImageUrl())
                    .email(user.getEmail())
                    .status(user.isBanned() ? "BANNED" : "ACTIVE")
                    .build());
        }

        // 2. Fallback to text search
        String normalizedKeyword = UnicodeUtils.toSearchable(keyword);
        Pageable pageable = Pageable.ofSize(size).withPage(page);

        Page<UserEntity> userEntities =
                userRepository.findDistinctByFullNameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrSearchFullNameContainingIgnoreCase(
                        keyword, keyword, normalizedKeyword, pageable
                );

        return userEntities.stream()
                .map(user -> SearchUserResponse.builder()
                        .id(user.getId())
                        .fullName(user.getFullName())
                        .imageUrl(user.getImageUrl())
                        .email(user.getEmail())
                        .status(user.isBanned() ? "BANNED" : "ACTIVE")
                        .build())
                .toList();
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

