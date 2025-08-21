import { useEffect, useRef, useState } from "react";
import { fetchConversationsApi } from "../helpers/chatApi";
import type { ConversationResponse } from "../helpers/chatApi";

export default function ChatView() {
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const observerRef = useRef<HTMLDivElement | null>(null);

  // Lấy userId từ localStorage khi component mount
  useEffect(() => {
    const uid = localStorage.getItem("userId");
    setUserId(uid);
  }, []);

  const loadMore = async () => {
    if (loading || !hasMore || !userId) return;
    setLoading(true);

    try {
      const data = await fetchConversationsApi(userId, page, 10);

      if (!data || data.content.length === 0) {
        setHasMore(false);
      } else {
        setConversations((prev) => [...prev, ...data.content]);

        // kiểm tra nếu đã tới trang cuối
        if (data.number >= data.totalPages - 1) {
          setHasMore(false);
        } else {
          setPage((prev) => prev + 1);
        }
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // Tải trang đầu tiên khi có userId
  useEffect(() => {
    if (userId) {
      loadMore();
    }
  }, [userId]);

  // Infinite scroll observer
  useEffect(() => {
    if (!observerRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        if (hasMore && !loading) {
          loadMore();
        }
      }
    });

    observer.observe(observerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, userId]);

  // Nếu chưa có userId thì hiển thị loading
  if (!userId) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-500">
        Loading user info...
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-100 border-r overflow-y-auto">
        {conversations.map((c) => (
          <div
            key={c.id}
            onClick={() => setSelectedConversation(c.id)}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-200 ${
              selectedConversation === c.id ? "bg-gray-300" : ""
            }`}
          >
            <img
              src={c.members?.[0]?.avatar || `https://i.pravatar.cc/150?u=${c.id}`}
              alt={c.name || "Conversation"}
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1">
              <div className="font-medium">{c.name || "Unnamed chat"}</div>
              <div className="text-sm text-gray-500 truncate">
                {c.lastMessage?.content || "No messages yet"}
              </div>
            </div>
          </div>
        ))}

        {/* Loader */}
        {loading && (
          <div className="text-center py-3 text-gray-500">Loading...</div>
        )}

        {/* Thông báo hết dữ liệu */}
        {!hasMore && conversations.length === 0 && (
          <div className="text-center py-3 text-gray-500">
            No conversations found
          </div>
        )}
        {!hasMore && conversations.length > 0 && (
          <div className="text-center py-3 text-gray-500">
            You have reached the end
          </div>
        )}

        <div ref={observerRef}></div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex items-center justify-center bg-white">
        {selectedConversation ? (
          <div className="text-gray-700 text-xl">
            Messages for conversation ID: {selectedConversation}
          </div>
        ) : (
          <div className="text-gray-500 text-2xl font-semibold text-center px-4">
            Welcome to JoFox
          </div>
        )}
      </main>
    </div>
  );
}
