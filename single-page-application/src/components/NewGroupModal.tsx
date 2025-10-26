// src/components/NewGroupModal.tsx
import { useState } from "react";
import { Users } from "lucide-react";
import { createConversation } from "../helpers/chatApi";
import { type GetFriendResponse } from "../helpers/friendApi";
import { fetchUserById } from "../helpers/userApi";
import { useNavigate } from "react-router-dom";
import { DEFAULT_AVATAR } from "../constants/common";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp * 1000;
    return Date.now() >= exp;
  } catch (e) {
    return true;
  }
}

interface NewGroupModalProps {
  currentUserId: string;
  userAvatar: string;
  friends: GetFriendResponse[];
  onClose: () => void;
  onCreated: (conv: any) => void; // có thể đổi sang ConversationResponse nếu bạn import type
}

function normalize(str: string) {
  return str
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // xóa dấu
    .toLowerCase();
}


export default function NewGroupModal({
  currentUserId,
  userAvatar,
  friends,
  onClose,
  onCreated,
}: NewGroupModalProps) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState<{ name?: string; members?: string }>({}); // <-- thêm
  const navigate = useNavigate();

  const handleToggleUser = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
    setErrors((prev) => ({ ...prev, members: undefined })); // xóa lỗi khi chọn
  };

  const handleCreate = async () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = "Group name is required";
    if (selected.length === 0) newErrors.members = "Please add at least one member";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // 🧠 Lấy thông tin user hiện tại
      const token = localStorage.getItem("refreshToken");
      const userId = localStorage.getItem("userId");

      if (!token || isTokenExpired(token) || !userId) {
        localStorage.clear();
        navigate("/login");
        return;
      }

      const data = await fetchUserById(userId);

      const members = [
        {
          userId: currentUserId,
          fullName: data.fullName || "Unknown User",
          imageUrl: userAvatar,
          role: "admin",
        },
        ...selected.map((id) => {
          const f = friends.find((u) => u.id === id)!;
          return {
            userId: f.id,
            fullName: f.fullName,
            imageUrl: f.imageUrl || "",
            role: "member",
          };
        }),
      ];

      const conv = await createConversation({
        type: "group",
        name: name.trim(),
        members,
      });

      onCreated(conv);
      onClose();
    } catch (err) {
      console.error("Failed to create group", err);
      alert("Failed to create group");
    }
  };

  const filteredFriends = friends.filter((f) =>
    normalize(f.fullName).includes(normalize(search))
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <div className="bg-white p-4 rounded w-80">
        <h2 className="font-bold mb-2 flex items-center gap-2">
          <Users className="w-5 h-5" /> New Group
        </h2>

        {/* Group name input */}
        <input
          type="text"
          placeholder="Group name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((prev) => ({ ...prev, name: undefined })); // xóa lỗi khi nhập
          }}
          className="border p-1 w-full mb-1"
        />
        {errors.name && (
          <div className="text-red-600 text-sm mb-2">{errors.name}</div>
        )}

        {/* Search input */}
        <input
          type="text"
          placeholder="Search friends..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-1 w-full mb-2"
        />

        {/* Friends list */}
        <div className="max-h-40 overflow-y-auto mb-1 border p-1">
          {filteredFriends.map((f) => (
            <div key={f.id} className="flex items-center gap-2 mb-1">
              <input
                type="checkbox"
                checked={selected.includes(f.id)}
                onChange={() => handleToggleUser(f.id)}
              />
              <img
                src={f.imageUrl || DEFAULT_AVATAR}
                className="w-6 h-6 rounded-full"
                alt={f.fullName}
              />
              <span>{f.fullName}</span>
            </div>
          ))}
          {filteredFriends.length === 0 && (
            <div className="text-gray-500 text-sm text-center py-2">
              No friends found
            </div>
          )}
        </div>
        {errors.members && (
          <div className="text-red-600 text-sm mb-2">{errors.members}</div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-2 py-1 border rounded">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-3 py-1 bg-blue-500 text-white rounded"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
