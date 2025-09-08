import api from "./axiosInterceptor";

// --- Interfaces ---
export interface MemberResponse {
  userId: string;
  fullName: string;
  imageUrl: string;
  role: string; // "admin" | "member"
}

export interface LastMessageResponse {
  messageId: string;
  content: string;
  senderId: string;
  sentAt: string;
}

export interface ConversationResponse {
  id: string;
  type: string;
  name: string | null;
  members: MemberResponse[];
  imageUrl: string | null;
  lastMessage: LastMessageResponse | null;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  sender: MemberResponse;
  type: string; // "text" | "media"
  content: string; // với media là JSON string chứa metadata
  createdAt: string;
}

export interface MessageCreateRequest {
  conversationId: string;
  senderId: string;
  senderFullName: string;
  senderImageUrl: string;
  content: string;
}

// --- APIs ---

// Lấy danh sách conversations
export async function fetchConversationsApi(
  userId: string
): Promise<ConversationResponse[]> {
  const res = await api.get(`/chat/conversations/user/${userId}`);
  return res.data as ConversationResponse[];
}

// Lấy messages theo conversationId
export async function fetchMessagesApi(
  conversationId: string,
  page = 0,
  size = 20
): Promise<MessageResponse[]> {
  const res = await api.get(
    `/chat/messages/conversation/${conversationId}?page=${page}&size=${size}`
  );
  return res.data as MessageResponse[];
}

// Tạo message text
export async function createTextMessageApi(
  req: MessageCreateRequest
): Promise<MessageResponse> {
  const res = await api.post("/chat/messages", req);
  return res.data as MessageResponse;
}

// Tạo message media (nhiều file)
export async function createMediaMessagesApi(
  conversationId: string,
  senderId: string,
  senderFullName: string,
  senderImageUrl: string,
  files: File[]
): Promise<MessageResponse[]> {
  const formData = new FormData();
  formData.append("conversationId", conversationId);
  formData.append("senderId", senderId);
  formData.append("senderName", senderFullName);
  formData.append("senderAvatar", senderImageUrl);

  files.forEach((file) => {
    formData.append("files", file);
  });

  const res = await api.post("/chat/messages/media", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as MessageResponse[];
}
