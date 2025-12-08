// src/helpers/callApi.ts
import api from "./axiosInterceptor";

export interface CallRequest {
  type: "audio" | "video";
  conversationId: string;
  conversationName?: string;
  callerId: string;
  callerName: string;
  callerImage: string;
}

// Vì backend trả về String -> FE không cần định nghĩa CallResponse
export async function startOrJoinCall(req: CallRequest): Promise<string> {
  const res = await api.post("/chat/calls/start-or-join", req);
  return res.data as string; // "Call event sent successfully"
}

// Thêm function để leave call
export async function leaveCall(conversationId: string, userId: string, userName: string): Promise<string> {
  const res = await api.delete(`/chat/calls/leave/${conversationId}/${userId}`, {
    params: { userName },
  });
  return res.data as string; // "Call event sent successfully"
}
