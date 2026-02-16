import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getFriends,
  unfriend,
  type GetFriendResponse,
} from "../helpers/friendApi";
import { updateUserImage } from "../helpers/authApi"; // ✅ api update ảnh
import { UserMinusIcon, CameraIcon } from "@heroicons/react/24/solid"; // ✅ import thêm icon
import { DEFAULT_AVATAR } from "../constants/common";
import ConfirmModal from "./ConfirmModal";

interface ProfileProps {
  fullName: string;
  email: string;
  imageUrl?: string;
  userId: string;
  provider?: string; // thêm provider nếu cần
}

export default function Profile({
  fullName,
  email,
  imageUrl,
  userId,
  provider,
}: ProfileProps) {
  const [friends, setFriends] = useState<GetFriendResponse[]>([]);
  const [confirmData, setConfirmData] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const avatar = imageUrl || DEFAULT_AVATAR;

  const fetchFriends = async () => {
    try {
      const res = await getFriends(userId);
      setFriends(res.data);
    } catch (err) {
      console.error("Error fetching friends:", err);
    }
  };

  const handleUnfriend = (friendId: string, friendName: string) => {
    setConfirmData({
      message: `Are you sure you want to unfriend ${friendName}?`,
      onConfirm: async () => {
        try {
          await unfriend(userId, friendId);
          setFriends((prev) => prev.filter((f) => f.id !== friendId));
        } catch (err) {
          console.error("Error unfriending:", err);
        } finally {
          setConfirmData(null);
        }
      },
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    try {
      const res = await updateUserImage(userId, file);
      if (res.data.status === 200) {
        window.location.reload();
      } else {
        console.error("Upload failed:", res.data.message);
      }
    } catch (err) {
      console.error("Error updating image:", err);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [userId]);

  return (
    <>
      <div className="flex items-center justify-center gap-40 mt-12 mb-8">
        {/* Avatar + info */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <img
              src={avatar}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border"
              referrerPolicy="no-referrer"
            />
            {/* Nút upload ảnh */}
            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 shadow">
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageChange}
              />
              <CameraIcon className="w-5 h-5" /> {/* icon thay vì chữ */}
            </label>
          </div>

          <div className="flex flex-col justify-end">
            <h2 className="text-2xl font-semibold text-gray-800">{fullName}</h2>
            <p className="text-gray-600">{email}</p>
          </div>
        </div>

        {/* Actions */}

        <div className="flex flex-col gap-3">
          <Link
            to="/profile/edit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-center"
          >
            Edit Profile
          </Link>
          {!provider && (
            <Link
              to="/profile/change-password"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-center"
            >
              Change Password
            </Link>
          )}
        </div>
      </div>

      {/* Friends list */}
      <div className="w-full max-w-3xl mx-auto">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Friends</h3>
        {friends.length > 0 ? (
          <ul className="space-y-4">
            {friends.map((friend) => (
              <li
                key={friend.id}
                className="flex items-center justify-between bg-white p-4 rounded-xl shadow"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={friend.imageUrl || DEFAULT_AVATAR}
                    alt={friend.fullName}
                    className="w-12 h-12 rounded-full object-cover border"
                    onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
                  />
                  <div>
                    <div className="font-semibold text-gray-900">
                      {friend.fullName}
                    </div>
                    <div className="text-gray-500 text-sm">{friend.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleUnfriend(friend.id, friend.fullName)}
                  className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition"
                >
                  <UserMinusIcon className="w-5 h-5" />
                  Unfriend
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No friends found.</p>
        )}
      </div>
      {confirmData && (
        <ConfirmModal
          title="Confirm Unfriend"
          message={confirmData.message}
          onConfirm={confirmData.onConfirm}
          onCancel={() => setConfirmData(null)}
        />
      )}
    </>
  );
}
