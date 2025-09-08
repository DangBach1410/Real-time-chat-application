import { useEffect, useState } from "react";
import { getFriends, unfriend, type GetFriendResponse } from "../helpers/friendApi";
import { UserMinusIcon } from "@heroicons/react/24/solid";
import { DEFAULT_AVATAR } from "../constants/common";

interface ProfileProps {
  fullName: string;
  email: string;
  imageUrl?: string;
  userId: string; // cần userId để gọi API
}

export default function Profile({ fullName, email, imageUrl, userId }: ProfileProps) {
  const [friends, setFriends] = useState<GetFriendResponse[]>([]);

  const fetchFriends = async () => {
    try {
      const res = await getFriends(userId);
      setFriends(res.data);
    } catch (err) {
      console.error("Error fetching friends:", err);
    }
  };

  const handleUnfriend = async (friendId: string) => {
    try {
      await unfriend(userId, friendId);
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
    } catch (err) {
      console.error("Error unfriending:", err);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [userId]);

  return (
    <div className="flex-1 flex flex-col items-center justify-start bg-gray-50 p-6">
      {/* Profile section */}
      <div className="flex flex-col items-center mb-8">
        <img
          src={imageUrl || DEFAULT_AVATAR}
          alt="Profile"
          className="w-32 h-32 rounded-full mb-4 object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
        />
        <h2 className="text-2xl font-semibold text-gray-800">{fullName}</h2>
        <p className="text-gray-600">{email}</p>
      </div>

      {/* Friends list */}
      <div className="w-full max-w-lg">
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
                  onClick={() => handleUnfriend(friend.id)}
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
    </div>
  );
}
