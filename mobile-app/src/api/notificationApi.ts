// src/api/notificationApi.ts
import api from './axiosInterceptor';

export interface SaveTokenRequest {
  userId: string;
  expoPushToken: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
}

export const saveNotificationToken = (data: SaveTokenRequest) => {
  return api.post<ApiResponse>('/notifications/token', data);
};