// src/helpers/authApi.ts
import api from './axiosInterceptor';

const AUTH_BASE_URL = 'http://localhost:8082/api/v1';

export interface RegisterRequest {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
}

export const register = (data: RegisterRequest) => {
  return api.post(`${AUTH_BASE_URL}/users/register`, data);
};

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export const login = (data: LoginRequest) => {
  return api.post(`${AUTH_BASE_URL}/auth/login`, data);
};

