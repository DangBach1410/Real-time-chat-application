import api from "./axiosInterceptor";

/**
 * =========================
 * ENUM (match backend)
 * =========================
 */
export const AdminAction = {
  BAN_USER: "BAN_USER",
  UNBAN_USER: "UNBAN_USER",
  DELETE_USER: "DELETE_USER",
} as const;

export type AdminAction =
  typeof AdminAction[keyof typeof AdminAction];

/**
 * =========================
 * RESPONSE DTOs
 * (map 1–1 backend)
 * =========================
 */

// UserResponse
export interface UserResponse {
  status: number;
  message: string;
}

// SearchUserResponse
export interface SearchUserResponse {
  id: string;
  fullName: string;
  imageUrl: string;
  email: string;
  status: UserStatus;
}

export type UserStatus = "ACTIVE" | "BANNED";

// AdminAuditLogResponse
export interface AdminAuditLogResponse {
  id: string;

  // Admin info
  adminId: string;

  // Action
  action: AdminAction;

  // Target user info
  targetUserId: string;
  targetUserEmail: string;
  targetUserName: string;

  // Result
  description: string;
  success: boolean;

  // Time
  createdAt: string; // LocalDateTime → ISO string
}

/**
 * =========================
 * PAGE RESPONSE (Spring)
 * =========================
 */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

/**
 * =========================
 * ADMIN API
 * =========================
 */
const BASE = "/admin";

export const adminApi = {
  /**
   * Ban user
   */
  banUser: (userId: string, adminId: string) => {
    return api.put<UserResponse>(
      `${BASE}/users/${userId}/ban`,
      null,
      { params: { adminId } }
    );
  },

  /**
   * Unban user
   */
  unbanUser: (userId: string, adminId: string) => {
    return api.put<UserResponse>(
      `${BASE}/users/${userId}/unban`,
      null,
      { params: { adminId } }
    );
  },

  /**
   * Delete user
   */
  deleteUser: (userId: string, adminId: string) => {
    return api.delete<UserResponse>(
      `${BASE}/users/${userId}`,
      { params: { adminId } }
    );
  },

  /**
   * Search users
   */
  searchUsers: (
    keyword: string,
    page = 0,
    size = 10
  ) => {
    return api.get<SearchUserResponse[]>(
      `${BASE}/users/search`,
      { params: { keyword, page, size } }
    );
  },

  /**
   * Get audit logs (paged)
   */
  getAuditLogs: (
    action?: AdminAction,
    adminId?: string,
    page = 0,
    size = 10
  ) => {
    return api.get<PageResponse<AdminAuditLogResponse>>(
      `${BASE}/audit-logs`,
      { params: { action, adminId, page, size } }
    );
  },
};
