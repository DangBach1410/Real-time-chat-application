import { useEffect, useState } from "react";
import { searchUsers } from "../helpers/searchApi";
import {
  sendFriendRequest,
  acceptFriendRequest,
  deleteFriendRequest,
} from "../helpers/friendApi";
import type { SearchUserResponse } from "../helpers/searchApi";
import { 
  UserPlusIcon, 
  XCircleIcon, 
  CheckCircleIcon, 
  ChatBubbleLeftIcon 
} from "@heroicons/react/24/solid";
import { DEFAULT_AVATAR } from "../constants/common";
import { useNavigate } from "react-router-dom";
import { getPrivateConversation } from "../helpers/chatApi";

export default function SearchResults({
  currentUserId,
  keyword,
}: {
  currentUserId: string;
  keyword: string;
}) {
  const [results, setResults] = useState<SearchUserResponse[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();

  const fetchUsers = async (customPage?: number) => {
    const pageToFetch = customPage !== undefined ? customPage : page;
    try {
      const res = await searchUsers(currentUserId, keyword, pageToFetch, 10);
      if (res.data.length === 0) {
        setHasMore(false);
      } else {
        setResults((prev) =>
          pageToFetch === 0 ? res.data : [...prev, ...res.data]
        );
        setPage(pageToFetch + 1);
      }
    } catch (err) {
      console.error("Search error:", err);
      setHasMore(false);
    }
  };

  useEffect(() => {
    setResults([]);
    setPage(0);
    setHasMore(true);
    fetchUsers(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  const goToChat = async (friendId: string) => {
    try {
      const conversation = await getPrivateConversation(currentUserId, friendId);
      navigate(`/chat/${conversation.id}`);
    } catch (err) {
      console.error("Cannot navigate to chat:", err);
    }
  };

  const handleSendRequest = async (receiverId: string) => {
    try {
      await sendFriendRequest(currentUserId, receiverId);
      setResults((prev) =>
        prev.map((u) =>
          u.id === receiverId ? { ...u, status: "PENDING" } : u
        )
      );
    } catch (err) {
      console.error("Send request error:", err);
    }
  };

  const handleAcceptRequest = async (senderId: string) => {
    try {
      await acceptFriendRequest(currentUserId, senderId);
      setResults((prev) =>
        prev.map((u) => (u.id === senderId ? { ...u, status: "FRIEND" } : u))
      );
    } catch (err) {
      console.error("Accept request error:", err);
    }
  };

  const handleDeleteRequest = async (otherUserId: string) => {
    try {
      await deleteFriendRequest(otherUserId, currentUserId);
      setResults((prev) =>
        prev.map((u) => (u.id === otherUserId ? { ...u, status: "NONE" } : u))
      );
    } catch (err) {
      console.error("Delete request error:", err);
    }
  };

  const renderActionButton = (user: SearchUserResponse) => {
    const baseClasses = "flex items-center gap-2 px-4 py-2 rounded-lg text-white transition hover:scale-105";

    switch (user.status) {
      case "FRIEND":
        return (
          <button
            onClick={() => goToChat(user.id)}
            className={`${baseClasses} bg-green-600 hover:bg-green-700`}>
            <ChatBubbleLeftIcon className="w-5 h-5" />
            Message
          </button>
        );
      case "PENDING":
        return (
          <button
            onClick={() => handleDeleteRequest(user.id)}
            className={`${baseClasses} bg-gray-400 hover:bg-gray-500`}
          >
            <XCircleIcon className="w-5 h-5" />
            Cancel Request
          </button>
        );
      case "REQUESTED":
        return (
          <button
            onClick={() => handleAcceptRequest(user.id)}
            className={`${baseClasses} bg-blue-600 hover:bg-blue-700`}
          >
            <CheckCircleIcon className="w-5 h-5" />
            Accept Friend Request
          </button>
        );
      case "NONE":
      default:
        return (
          <button
            onClick={() => handleSendRequest(user.id)}
            className={`${baseClasses} bg-blue-600 hover:bg-blue-700`}
          >
            <UserPlusIcon className="w-5 h-5" />
            Add Friend
          </button>
        );
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-100 pt-12 flex justify-center">
      <div className="w-full max-w-3xl">
        <h3 className="text-2xl font-semibold mb-6 text-left text-gray-800">
          Search Results:
        </h3>
        {results.length > 0 ? (
          <ul className="space-y-4">
            {results.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between bg-white rounded-xl p-5 shadow hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={user.imageUrl || DEFAULT_AVATAR}
                    alt={user.fullName}
                    className="w-14 h-14 rounded-full object-cover border"
                  />
                  <div>
                    <div className="font-semibold text-gray-900 text-lg">
                      {user.fullName}
                    </div>
                    <div className="text-gray-500 text-sm">
                      {user.email || "No email"}
                    </div>
                  </div>
                </div>
                {renderActionButton(user)}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500 text-lg">No results found.</div>
        )}
        {hasMore && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => fetchUsers()}
              className="bg-gray-200 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
