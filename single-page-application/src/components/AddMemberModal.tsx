// src/components/AddMemberModal.tsx
import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { DEFAULT_AVATAR } from "../constants/common";
import { type GetFriendResponse, getFriends } from "../helpers/friendApi";
import { addMembersToConversation } from "../helpers/chatApi";
import type { MemberResponse, MemberRequest } from "../helpers/chatApi";

interface AddMemberModalProps {
  conversationId: string;
  currentUserId: string;
  existingMembers: MemberResponse[]; // những người đã là member
  onClose: () => void;
  onMembersAdded: (conversationId: string) => void;
}

function normalize(str: string) {
  return str
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function AddMemberModal({
  conversationId,
  currentUserId,
  existingMembers,
  onClose,
  onMembersAdded,
}: AddMemberModalProps) {
  const [friends, setFriends] = useState<GetFriendResponse[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Lấy danh sách friends
  useEffect(() => {
    getFriends(currentUserId)
      .then((res) => setFriends(res.data))
      .catch((err) => {
        console.error("Failed to fetch friends", err);
        alert("Failed to fetch friends");
      });
  }, [currentUserId]);

  const handleToggleUser = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const handleAdd = async () => {
    if (selected.length === 0) return;

    setLoading(true);
    try {
      // Chuẩn bị members để gửi lên API
      const members: MemberRequest[] = selected.map((id) => {
        const f = friends.find((u) => u.id === id)!;
        return {
          userId: f.id,
          fullName: f.fullName,
          imageUrl: f.imageUrl || "",
          role: "member",
        };
      });

      await addMembersToConversation(conversationId, members);
      onMembersAdded(conversationId);
      onClose();
    } catch (err) {
      console.error("Failed to add members", err);
      alert("Failed to add members");
    } finally {
      setLoading(false);
    }
  };

  // Lọc bạn bè: loại bỏ những người đã là member + theo search
  const filteredFriends = friends
    .filter((f) => !existingMembers.some((m) => m.userId === f.id))
    .filter((f) => normalize(f.fullName).includes(normalize(search)));

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <div className="bg-white p-4 rounded w-80">
        <h2 className="font-bold mb-2 flex items-center gap-2">
          <UserPlus className="w-5 h-5" /> Add Members
        </h2>

        <input
          type="text"
          placeholder="Search friends..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-1 w-full mb-2"
        />

        <div className="max-h-40 overflow-y-auto mb-2 border p-1">
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
              No friends available to add
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-2 py-1 border rounded">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={loading}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
