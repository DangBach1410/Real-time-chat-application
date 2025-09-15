import api from './axiosInterceptor';

export interface PresenceUpdateResponse {
  userId: string;
  lastSeen: number;
}

export const updatePresence = (userId: string) => {
  return api.post(`/presence/update`, null, {
    params: { userId },
  });
};

export const getPresence = (userId: string) => {
  return api.get<PresenceUpdateResponse>(`/presence/${userId}`);
};
