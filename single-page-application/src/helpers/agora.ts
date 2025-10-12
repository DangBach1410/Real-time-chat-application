// helpers/agora.ts
import AgoraRTC from "agora-rtc-sdk-ng";

export const APP_ID = "2b913c2664e942428ca17f0807a96767";
export const agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
