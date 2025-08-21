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
