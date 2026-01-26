// src/helpers/authApi.ts
import api from './axiosInterceptor';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  status: number;
  message: string;
  accessToken: string;
  refreshToken: string;
  userId: string;
}

export const login = (data: LoginRequest) => {
  return api.post<LoginResponse>('/auth/admin/login', data);
};

