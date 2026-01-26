import { useEffect } from "react";
import { Phone, X } from "lucide-react";
import { startOrJoinCall, type CallRequest } from "../helpers/callApi";
import { fetchUserById, type UserResponse } from "../helpers/userApi";
import { useState } from "react";

interface IncomingCallModalProps {
  open: boolean;
  callerName: string;
  callerImage?: string;
  callType: "audio" | "video";
  conversationId: string;
  conversationName?: string;
  onAccept: (uid: number) => void;
  onDecline: () => void;
  onTimeout?: () => void; // callback khi modal tự tắt sau 1 phút
}

export default function IncomingCallModal({
  open,
  callerName,
  callerImage,
  callType,
  conversationId,
  conversationName,
  onAccept,
  onDecline,
  onTimeout,
}: IncomingCallModalProps) {
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);

  useEffect(() => {  
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    fetchUserById(userId)
      .then((user) => setCurrentUser(user))
      .catch((err) => console.error("Failed to fetch current user:", err));
  }, []);

  useEffect(() => {
    if (!open) return;

    // Tạo và play ringtone
    const audio = new Audio("/sounds/ring.mp3");
    audio.loop = true;
    audio.play().catch(() => {
      console.warn("Cannot autoplay sound, user interaction needed");
    });

    // Timeout tự động đóng sau 1 phút (60000ms)
    const timeoutId = setTimeout(() => {
      audio.pause();
      onTimeout?.();
    }, 60000);

    // Cleanup khi modal đóng hoặc unmount
    return () => {
      audio.pause();
      clearTimeout(timeoutId);
    };
  }, [open, onTimeout]);

  if (!open) return null;

  const callText = conversationName
    ? `Incoming ${callType} call to ${conversationName}...`
    : `Incoming ${callType} call to you...`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-80 text-center">
        <img
          src={callerImage || "/default-avatar.png"}
          alt={callerName}
          className="w-16 h-16 rounded-full mx-auto mb-3 object-cover"
        />
        <h3 className="text-lg font-semibold">{callerName}</h3>
        <p className="text-gray-500 mb-4">{callText}</p>

        <div className="flex justify-center gap-6">
          <button
            onClick={async () => {
              try {
                const callerId = localStorage.getItem("userId") || "";
                const req: CallRequest = {
                  type: callType,
                  conversationId: conversationId,
                  conversationName,
                  callerId,
                  callerName: currentUser?.fullName || "",
                  callerImage: currentUser?.imageUrl || "",
                };
                const res = await startOrJoinCall(req);
                console.log(res); // "Call event sent successfully"
                onAccept(res.agoraUid); // gọi callback gốc
              } catch (error) {
                console.error("Failed to start/join call:", error);
              }
            }}
            className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full flex items-center justify-center"
          >
            <Phone size={24} />
          </button>
          <button
            onClick={() => {onDecline()}}
            className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full flex items-center justify-center"
          >
            <X size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
