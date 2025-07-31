// src/helpers/authApi.ts
import api from './axiosInterceptor';

const AUTH_BASE_URL = 'http://localhost:8082/api/v1/users';

export interface RegisterData {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
}

export const register = (data: RegisterData) => {
  return api.post(`${AUTH_BASE_URL}/register`, data);
};


