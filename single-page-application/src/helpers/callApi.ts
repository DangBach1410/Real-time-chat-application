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
export async function startCall(req: CallRequest): Promise<string> {
  const res = await api.post("/chat/calls/start", req);
  return res.data as string; // "Call event sent successfully"
}
