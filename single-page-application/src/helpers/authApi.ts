// src/helpers/authApi.ts
import api from './axiosInterceptor';

export interface RegisterRequest {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
}

export const register = (data: RegisterRequest) => {
  return api.post('/auth/users/register', data);
};

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

export const login = (data: LoginRequest) => {
  return api.post<LoginResponse>('/auth/login', data);
};

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const changePassword = (userId: string, data: ChangePasswordRequest) => {
  return api.put<UserResponse>(`/auth/users/${userId}/change-password`, data);
};

export interface UpdateRequest {
  firstName: string;
  lastName: string;
  email: string;
  language?: string;
  languageCode?: string;
}

export interface UserResponse {
  status: number;
  message: string;
  fullName?: string;
  email?: string;
  imageUrl?: string;
  provider?: "google" | "github";
  firstName?: string;
  lastName?: string;
  language?: string;
  languageCode?: string;
}

export const updateUser = (userId: string, data: UpdateRequest) => {
  return api.put<UserResponse>(`/auth/users/${userId}`, data);
};

export const updateUserImage = (userId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  return api.put<UserResponse>(
    `/auth/users/${userId}/update-image`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
};