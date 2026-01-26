// src/components/ChatCrossBar.tsx
import { MoreHorizontal, Phone, Video } from "lucide-react";
import { DEFAULT_AVATAR } from "../constants/common";
import type { ConversationResponse } from "../helpers/chatApi";
import { startOrJoinCall, type CallRequest } from "../helpers/callApi";

interface ChatCrossBarProps {
  conversation: ConversationResponse;
  currentUserId: string;
  lastSeen?: number | null;
  usersPresence: Record<string, number>;
  onOpenDetails: () => void;
}

export default function ChatCrossBar({
  conversation,
  currentUserId,
  lastSeen,
  usersPresence,
  onOpenDetails,
}: ChatCrossBarProps) {
  // const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  function isGroupOnline(group: ConversationResponse, currentUserId: string, usersPresence: Record<string, number>): boolean {
    return group.members.some(member => 
      member.userId !== currentUserId && // loại bỏ chính user
      (() => {
        const lastSeen = usersPresence[member.userId];
        if (!lastSeen) return false;
        const diffMinutes = (Date.now() - lastSeen) / 60000;
        return diffMinutes <= 5; // online nếu < 5 phút
      })()
    );
  }

  const isPrivate = conversation.type === "private";
  const otherUser = isPrivate
    ? conversation.members.find((m) => m.userId !== currentUserId)
    : null;

  const displayName = isPrivate
    ? otherUser?.fullName
    : conversation.name || "Unnamed group";
  const displayImage = isPrivate
    ? otherUser?.imageUrl || DEFAULT_AVATAR
    : conversation.imageUrl || DEFAULT_AVATAR;

  const diffMinutes =
    lastSeen !== undefined && lastSeen !== null
      ? Math.floor((Date.now() - lastSeen) / 60000)
      : null;
  
  const isOnline = conversation.type === "group" 
    ? isGroupOnline(conversation, currentUserId, usersPresence)
    : diffMinutes !== null && diffMinutes <= 5;

  const statusText = isOnline
    ? "Online"
    : isPrivate
    ? diffMinutes !== null
      ? `Active ${diffMinutes} minutes ago`
      : "Offline"
    : "Offline"; // group offline

  const openCall = async (type: "audio" | "video") => {
    try {
      const currentUser = conversation.members.find(
        (m) => m.userId === currentUserId
      );
      if (!currentUser) throw new Error("User not found in conversation");

      const payload: CallRequest = {
        type,
        conversationId: conversation.id,
        callerId: currentUserId,
        callerName: currentUser.fullName,
        callerImage: currentUser.imageUrl || DEFAULT_AVATAR,
      };

      const response = await startOrJoinCall(payload);

      const url = `/call?channel=${conversation.id}&type=${type}&agoraUid=${response.agoraUid}`;
      window.open(url, "_blank", "width=1000,height=700");
    } catch (err) {
      console.error("❌ Failed to start call:", err);
      alert("Failed to start call. Please try again.");
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-100">
      {/* Left: avatar + name */}
      <div className="flex items-center gap-3 relative">
        <div className="relative">
          {conversation.type === "group" ? (
            conversation.imageUrl ? (
              // 🧩 Trường hợp group có ảnh riêng
              <img
                src={conversation.imageUrl}
                alt={conversation.name || "Group"}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              // 🧩 Trường hợp group không có ảnh -> hiển thị 2 thành viên cuối
              <div className="relative w-10 h-10">
                {conversation.members.slice(-2).map((m, idx) => (
                  <img
                    key={m.userId}
                    src={m.imageUrl || DEFAULT_AVATAR}
                    alt={m.fullName}
                    className={`absolute object-cover rounded-full ${
                      idx === 0
                        ? "top-0 right-0 z-0 w-5 h-5"
                        : "bottom-0 left-0 z-10 w-5 h-5"
                    }`}
                    style={{ width: "1.65rem", height: "1.65rem" }}
                  />
                ))}
              </div>
            )
          ) : (
            // 🧩 Trường hợp private chat
            <img
              src={displayImage || DEFAULT_AVATAR}
              alt={conversation.name || "User"}
              className="w-10 h-10 rounded-full object-cover"
            />
          )}

          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${
              isOnline ? "bg-green-500" : ""
            }`}
            title={statusText}
          />
        </div>
        <div className="flex flex-col">
          <div className="font-medium">{displayName}</div>
          <div className="text-xs text-gray-500">{statusText}</div>
        </div>
      </div>

      {/* Right: call icons + 3-dot */}
      <div className="flex items-center gap-3 relative">
        <button
          onClick={() => openCall("audio")}
          className="p-2 rounded-full hover:bg-gray-200"
          title="Voice call"
        >
          <Phone className="w-5 h-5" />
        </button>
        <button
          onClick={() => openCall("video")}
          className="p-2 rounded-full hover:bg-gray-200"
          title="Video call"
        >
          <Video className="w-5 h-5" />
        </button>

        {/* 3-dot: mở modal lớn */}
        <div className="relative">
          <button
            onClick={onOpenDetails}
            className="p-2 rounded-full hover:bg-gray-200"
            title="Conversation Details"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
