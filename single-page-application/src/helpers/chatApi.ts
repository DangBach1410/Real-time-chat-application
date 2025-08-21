import api from "./axiosInterceptor";  // axios instance có interceptor

export interface MemberResponse {
  id: string;
  name: string;
  avatar: string;
}

export interface LastMessageResponse {
  id: string;
  content: string;
  senderId: string;
  sentAt: string;
}

export interface ConversationResponse {
  id: string;
  type: string;
  name: string;
  members: MemberResponse[];
  lastMessage: LastMessageResponse | null;
  lastMessageAt: string | null;
  createdAt: string;
}

// Nếu BE có phân trang
export interface PaginatedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number; // trang hiện tại
}

// Hàm gọi API lấy danh sách conversation theo userId
export async function fetchConversationsApi(
  userId: string,
  page: number,
  size: number
): Promise<PaginatedResponse<ConversationResponse>> {
  const res = await api.get(`/chat/conversations/user/${userId}`, {
    params: { page, size },
  });
  return res.data as PaginatedResponse<ConversationResponse>;
}
