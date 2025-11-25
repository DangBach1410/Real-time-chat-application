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
  type: "text" | "link" | "media" | "notification" | "video_call" | "audio_call";
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
  type: "text" | "link" | "media" | "notification" | "video_call" | "audio_call" | "text-translation";
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

export interface MemberRequest {
  userId: string;
  fullName: string;
  imageUrl: string;
  role: string;
}

export interface ConversationCreateRequest {
  type: "private" | "group";
  name?: string;
  members: MemberRequest[];
}


// --- APIs ---

// Lấy danh sách conversations có phân trang
export async function fetchConversations(
  userId: string,
  page = 0,
  size = 20
): Promise<ConversationResponse[]> {
  const res = await api.get(
    `/chat/conversations/user/${userId}?page=${page}&size=${size}`
  );
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

export async function createConversation(
  req: ConversationCreateRequest
): Promise<ConversationResponse> {
  const res = await api.post("/chat/conversations", req);
  return res.data as ConversationResponse;
}

// Lấy danh sách members của conversation
export async function fetchConversationMembers(
  conversationId: string
): Promise<MemberResponse[]> {
  const res = await api.get(`/chat/conversations/${conversationId}/members`);
  return res.data as MemberResponse[];
}

// Lấy media của conversation (pagination)
export async function fetchConversationMedia(
  conversationId: string,
  page = 0,
  size = 20
): Promise<MessageResponse[]> {
  const res = await api.get(
    `/chat/conversations/${conversationId}/media?page=${page}&size=${size}`
  );
  return res.data as MessageResponse[];
}

// Lấy files của conversation (pagination)
export async function fetchConversationFiles(
  conversationId: string,
  page = 0,
  size = 20
): Promise<MessageResponse[]> {
  const res = await api.get(
    `/chat/conversations/${conversationId}/files?page=${page}&size=${size}`
  );
  return res.data as MessageResponse[];
}

// Lấy links của conversation (pagination)
export async function fetchConversationLinks(
  conversationId: string,
  page = 0,
  size = 20
): Promise<MessageResponse[]> {
  const res = await api.get(
    `/chat/conversations/${conversationId}/links?page=${page}&size=${size}`
  );
  return res.data as MessageResponse[];
}

// Xóa member khỏi conversation
export async function removeConversationMember(
  conversationId: string,
  userId: string
): Promise<ConversationResponse> {
  const res = await api.delete(
    `/chat/conversations/${conversationId}/members/${userId}`
  );
  return res.data as ConversationResponse;
}

export async function addMembersToConversation(
  conversationId: string,
  members: MemberRequest[]
): Promise<ConversationResponse> {
  const res = await api.post(`/chat/conversations/${conversationId}/members`, {
    members,
  });
  return res.data as ConversationResponse;
}

export async function updateConversationImage(
  conversationId: string,
  userId: string,
  userFullname: string,
  file: File
): Promise<ConversationResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("userFullname", userFullname);
  formData.append("userId", userId);

  const res = await api.put(
    `/chat/conversations/${conversationId}/update-image`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data as ConversationResponse;
}

export async function updateConversationName(
  conversationId: string,
  userId: string,
  userFullname: string,
  name: string
): Promise<ConversationResponse> {
  const res = await api.put(
    `/chat/conversations/${conversationId}/update-name?userId=${encodeURIComponent(
      userId
    )}&name=${encodeURIComponent(name)}&userFullname=${encodeURIComponent(
      userFullname
    )}`
  );
  return res.data as ConversationResponse;
}

export async function getPrivateConversation(
  currentUserId: string,
  otherUserId: string
): Promise<ConversationResponse> {
  // Gọi endpoint backend để lấy conversation private
  const res = await api.get<ConversationResponse>(
    `/chat/conversations/private`,
    { params: { currentUserId, otherUserId } }
  );
  return res.data;
}

// --- Search conversations ---
export async function searchConversations(
  currentUserId: string,
  q: string,
  page = 0,
  size = 20
): Promise<ConversationResponse[]> {
  const res = await api.get("/chat/conversations/search", {
    params: { currentUserId, q, page, size },
  });
  return res.data as ConversationResponse[];
}

export async function searchMessages(
  conversationId: string,
  keyword: string,
  page = 0,
  size = 20
): Promise<MessageResponse[]> {
  const res = await api.get("/chat/messages/search", {
    params: { conversationId, keyword, page, size },
  });

  return res.data as MessageResponse[];
}
// --- Fetch message context (around a pivot message) ---
export async function fetchMessageContext(
  conversationId: string,
  messageId: string,
  before = 20,
  after = 20
): Promise<MessageResponse[]> {
  const res = await api.get(
    `/chat/messages/conversation/${conversationId}/context`,
    { params: { messageId, before, after } }
  );
  return res.data as MessageResponse[];
}

// --- Fetch old messages (scroll lên trên) ---
export async function fetchOldMessages(
  conversationId: string,
  beforeMessageId: string,
  limit = 30
): Promise<MessageResponse[]> {
  const res = await api.get(
    `/chat/messages/conversation/${conversationId}/old`,
    { params: { beforeMessageId, limit } }
  );
  return res.data as MessageResponse[];
}

// --- Fetch new messages (scroll xuống dưới) ---
export async function fetchNewMessages(
  conversationId: string,
  afterMessageId: string,
  limit = 30
): Promise<MessageResponse[]> {
  const res = await api.get(
    `/chat/messages/conversation/${conversationId}/new`,
    { params: { afterMessageId, limit } }
  );
  return res.data as MessageResponse[];
}