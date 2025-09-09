import api from "./axiosInterceptor";

export interface UserResponse {
  status: number;
  message: string;
  fullName: string;
  email: string;
  imageUrl: string;
}

// Hàm gọi API lấy user theo id
export async function fetchUserById(userId: string): Promise<UserResponse> {
  const res = await api.get(`/auth/users/${userId}`);
  return res.data as UserResponse;
}
