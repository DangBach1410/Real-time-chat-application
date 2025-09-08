import { useEffect, useState } from "react";
import {
  getFriendRequests,
  acceptFriendRequest,
  deleteFriendRequest,
  type GetFriendRequestResponse,
} from "../helpers/friendApi";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { DEFAULT_AVATAR } from "../constants/common";

interface FriendRequestsProps {
  currentUserId: string;
}

export default function FriendRequests({ currentUserId }: FriendRequestsProps) {
  const [requests, setRequests] = useState<GetFriendRequestResponse[]>([]);

  const fetchRequests = async () => {
    try {
      const res = await getFriendRequests(currentUserId);
      setRequests(res.data);
    } catch (err) {
      console.error("Error fetching friend requests:", err);
    }
  };

  const handleAccept = async (senderId: string) => {
    try {
      await acceptFriendRequest(currentUserId, senderId);
      setRequests((prev) => prev.filter((r) => r.senderId !== senderId));
    } catch (err) {
      console.error("Error accepting request:", err);
    }
  };

  const handleReject = async (senderId: string) => {
    try {
      await deleteFriendRequest(currentUserId, senderId);
      setRequests((prev) => prev.filter((r) => r.senderId !== senderId));
    } catch (err) {
      console.error("Error rejecting request:", err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUserId]);

  return (
    <div className="w-full min-h-screen flex flex-col items-center bg-gray-100 p-4">
      {/* Tiêu đề căn trái */}
      <h3 className="text-xl font-semibold text-gray-800 mb-6 w-full max-w-lg">
        Friend Requests
      </h3>

      {requests.length > 0 ? (
        <ul className="space-y-4 w-full max-w-lg mx-auto"> {/* căn giữa theo chiều ngang */}
          {requests.map((req) => (
            <li
              key={req.senderId}
              className="flex items-center justify-between p-4 border rounded-lg shadow-sm bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <img
                  src={req.senderImageUrl || DEFAULT_AVATAR}
                  alt={req.senderFullName}
                  className="w-12 h-12 rounded-full object-cover border"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_AVATAR;
                  }}
                />
                <div>
                  <div className="font-semibold text-gray-900 text-lg">
                    {req.senderFullName}
                  </div>
                  <div className="text-gray-500 text-sm">
                    {req.senderEmail || "No email"}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(req.senderId)}
                  className="flex items-center gap-1 bg-blue-600 text-white px-4 py-1 rounded-lg hover:bg-blue-700 transition"
                >
                  <CheckCircleIcon className="w-5 h-5" />
                  Accept
                </button>
                <button
                  onClick={() => handleReject(req.senderId)}
                  className="flex items-center gap-1 bg-red-500 text-white px-4 py-1 rounded-lg hover:bg-red-600 transition"
                >
                  <XCircleIcon className="w-5 h-5" />
                  Reject
                </button>
              </div>

            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center mt-4">
          No pending friend requests.
        </p>
      )}
    </div>
  );
}
