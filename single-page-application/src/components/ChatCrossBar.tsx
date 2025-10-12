// src/components/ChatCrossBar.tsx
import { useState } from "react";
import { MoreHorizontal, Phone, Video } from "lucide-react";
import { DEFAULT_AVATAR } from "../constants/common";
import type { ConversationResponse } from "../helpers/chatApi";
import ConversationDetailsModal from "./ConversationDetailsModal";
import {
  fetchConversationMembers,
  fetchConversationMedia,
  fetchConversationFiles,
  fetchConversationLinks,
} from "../helpers/chatApi";

interface ChatCrossBarProps {
  conversation: ConversationResponse;
  currentUserId: string;
  lastSeen?: number | null;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
  onConversationUpdated?: (updated: ConversationResponse) => void;
}

export default function ChatCrossBar({
  conversation,
  currentUserId,
  lastSeen,
  // onVoiceCall,
  // onVideoCall,
  onConversationUpdated,
}: ChatCrossBarProps) {
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

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

  // const admin = conversation.members.find((m) => m.role === "admin");
  // const adminId = admin?.userId || null;
  // const canRemoveMember = adminId === currentUserId;

  const diffMinutes =
    lastSeen !== undefined && lastSeen !== null
      ? Math.floor((Date.now() - lastSeen) / 60000)
      : null;
  const isOnline = diffMinutes !== null && diffMinutes <= 5;

  const openCall = (type: "audio" | "video") => {
    const url = `/call?channel=${conversation.id}&type=${type}&uid=${currentUserId}`;
    window.open(url, "_blank", "width=1000,height=700");
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-100">
      {/* Left: avatar + name */}
      <div className="flex items-center gap-3 relative">
        <div className="relative">
          {/* <img
            src={displayImage}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover"
            onError={(e) =>
              ((e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR)
            }
          /> */}
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

          {isPrivate && otherUser && (
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                isOnline ? "bg-green-500" : "bg-gray-400"
              }`}
              title={
                isOnline
                  ? "Online"
                  : diffMinutes !== null
                  ? `Active ${diffMinutes} minutes ago`
                  : "Offline"
              }
            />
          )}
        </div>
        <div className="flex flex-col">
          <div className="font-medium">{displayName}</div>
          {lastSeen !== undefined && (
            <div className="text-xs text-gray-500">
              {isOnline
                ? "Online"
                : diffMinutes !== null
                ? `Active ${diffMinutes} minutes ago`
                : "Offline"}
            </div>
          )}
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
            onClick={() => setDetailsModalOpen(true)}
            className="p-2 rounded-full hover:bg-gray-200"
            title="Conversation Details"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Conversation Details Modal */}
      {detailsModalOpen && (
        <ConversationDetailsModal
          conversation={conversation}
          currentUserId={currentUserId}
          onClose={() => setDetailsModalOpen(false)}
          fetchMembers={fetchConversationMembers}
          fetchMedia={fetchConversationMedia}
          fetchFiles={fetchConversationFiles}
          fetchLinks={fetchConversationLinks}
          onConversationUpdated={onConversationUpdated}
        />
      )}
    </div>
  );
}
