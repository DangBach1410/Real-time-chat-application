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

/**
 * API response for call initialization.
 * Contains Agora connection details including numeric UID.
 */
export interface CallResponse {
  /** Agora channel name to join */
  channel: string;
  /** Numeric Agora UID (uint32) - use this for Agora.join() */
  agoraUid: number;
  /** Agora authentication token (if required) */
  token: string;
  /** Call type: "audio" or "video" */
  type: "audio" | "video";
  /** Caller's user ID (string) */
  callerId: string;
  /** Caller's full name */
  callerName: string;
  /** Caller's avatar URL */
  callerImage: string;
}

/**
 * Initiates a call or joins an existing one.
 * Backend generates numeric Agora UID deterministically from userId.
 * 
 * @param req Call request with caller info
 * @returns CallResponse with Agora channel, numeric UID, and metadata
 */
export async function startOrJoinCall(req: CallRequest): Promise<CallResponse> {
  const res = await api.post("/chat/calls/start-or-join", req);
  return res.data as CallResponse;
}

/**
 * Leaves a call.
 * 
 * @param conversationId Channel/conversation ID
 * @param userId User's string ID
 * @param userName User's display name
 * @returns Success message
 */
export async function leaveCall(conversationId: string, userId: string, userName: string): Promise<string> {
  const res = await api.delete(`/chat/calls/leave/${conversationId}/${userId}`, {
    params: { userName },
  });
  return res.data as string;
}

/**
 * Retrieves the user ID for a given Agora UID.
 * Use this to map remote Agora UID back to string userId.
 * 
 * @param conversationId Channel/conversation ID
 * @param agoraUid Numeric Agora UID
 * @returns String user ID for the Agora UID
 */
export async function getUserIdFromAgoraUid(conversationId: string, agoraUid: number): Promise<string> {
  const res = await api.get(`/chat/calls/${conversationId}/agora-uid/${agoraUid}/user-id`);
  return res.data as string;
}

