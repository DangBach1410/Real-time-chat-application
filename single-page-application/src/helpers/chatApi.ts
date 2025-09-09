import api from "./axiosInterceptor";

// --- Interfaces ---
export interface MemberResponse {
  userId: string;
  fullName: string;
  imageUrl: string;
  role: string | null; // "admin" | "member" | null
  joinedAt?: string | null;
}

export interface LastMessageResponse {
  messageId: string;
  sender: {
    userId: string;
    fullName: string;
    imageUrl?: string;
    role?: string | null;
    joinedAt?: string | null;
  };
  type: "text" | "link" | "media";
  content: string;
  createdAt: string;
}

export interface ConversationResponse {
  id: string;
  type: "private" | "group";
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
  type: "text" | "link" | "media";
  content: string; // với media là JSON string chứa metadata
  createdAt: string;
}

export interface MessageCreateRequest {
  conversationId: string;
  senderId: string;
  senderFullName: string;
  senderImageUrl: string;
  content: string;
  type: "text" | "link";
}

// --- APIs ---

// Lấy danh sách conversations
export async function fetchConversations(
  userId: string
): Promise<ConversationResponse[]> {
  const res = await api.get(`/chat/conversations/user/${userId}`);
  return res.data as ConversationResponse[];
}

// Lấy messages theo conversationId
export async function fetchMessages(
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
export async function createTextMessage(
  req: MessageCreateRequest
): Promise<MessageResponse> {
  const res = await api.post("/chat/messages", req);
  return res.data as MessageResponse;
}

// Tạo message media (nhiều file)
export async function createMediaMessages(
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
