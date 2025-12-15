import api from './axiosInterceptor';

export const sendFriendRequest = (senderId: string, receiverId: string) => {
  return api.post(`/auth/users/${receiverId}/friend-requests`, null, {
    params: { senderId },
  });
};

// Chấp nhận lời mời kết bạn
export const acceptFriendRequest = (receiverId: string, senderId: string) => {
  return api.post(`/auth/users/${receiverId}/friend-requests/${senderId}/accept`);
};

// Xóa lời mời kết bạn (hủy hoặc từ chối)
export const deleteFriendRequest = (receiverId: string, senderId: string) => {
  return api.delete(`/auth/users/${receiverId}/friend-requests/${senderId}`);
};

export interface GetFriendResponse {
  id: string;
  fullName: string;
  email: string;
  imageUrl?: string;
}

export const getFriends = (userId: string) => {
  return api.get<GetFriendResponse[]>(`/auth/users/${userId}/friends`);
};

export const unfriend = (userId: string, friendId: string) => {
  return api.delete(`/auth/users/${userId}/friends/${friendId}`);
};

export interface GetFriendRequestResponse {
  senderId: string;
  senderFullName: string;
  senderEmail?: string;
  senderImageUrl?: string;
}

export const getFriendRequests = (userId: string) => {
  return api.get<GetFriendRequestResponse[]>(`/auth/users/${userId}/friend-requests`);
};