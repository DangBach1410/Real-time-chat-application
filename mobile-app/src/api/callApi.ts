// src/api/callApi.ts
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
  /** Numeric Agora UID (uint32) - use this for Agora joinChannel() */
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
 * Retrieves the numeric Agora UID for a participant.
 * Use this to get Agora UIDs for remote users by their string ID.
 * DEPRECATED: Use getUserIdFromAgoraUid instead (reverse mapping).
 * 
 * @param conversationId Channel/conversation ID
 * @param userId User's string ID
 * @returns Numeric Agora UID for the user
 */
export async function getAgoraUid(conversationId: string, userId: string): Promise<number> {
  const res = await api.get(`/chat/calls/${conversationId}/user/${userId}/agora-uid`);
  return res.data as number;
}

/**
 * Retrieves the user ID for a remote participant by their Agora UID.
 * Reverse mapping: agoraUid → userId
 * Use this in CallScreen to map remote Agora UIDs to user IDs,
 * then fetch user info (name, avatar) for display.
 * 
 * @param conversationId Channel/conversation ID
 * @param agoraUid Numeric Agora UID from remote participant
 * @returns User's string ID (userId)
 * @throws 404 if mapping not found (participant not in call)
 */
export async function getUserIdFromAgoraUid(conversationId: string, agoraUid: number): Promise<string> {
  const res = await api.get(`/chat/calls/${conversationId}/agora-uid/${agoraUid}/user-id`);
  return res.data as string;
}
