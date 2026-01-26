// helpers/agora.ts
import AgoraRTC from "agora-rtc-sdk-ng";

export const APP_ID = import.meta.env.VITE_AGORA_APP_ID;

export const agoraClient = AgoraRTC.createClient({
  mode: "rtc",
  codec: "vp8",
});

