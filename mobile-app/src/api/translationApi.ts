import api from "./axiosInterceptor";
import type { MessageResponse } from "./chatApi"; // reuse từ chatApi

export async function translateMessage(
  message: MessageResponse,
  targetLang = "en"
): Promise<MessageResponse> {
  const res = await api.post("/translate", message, {
    params: { targetLang },
  });
  return res.data as MessageResponse;
}
