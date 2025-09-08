import { useEffect, useRef, useState } from "react";
import {
  fetchConversationsApi,
  fetchMessagesApi,
  createTextMessageApi,
  createMediaMessagesApi,
  type ConversationResponse,
  type MessageResponse,
} from "../helpers/chatApi";
import { DEFAULT_AVATAR } from "../constants/common";
import { FileText } from "lucide-react";

interface ChatViewProps {
  userId: string;
  userName: string;
  userAvatar: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB
const PAGE_SIZE = 20;

export default function ChatView({ userId, userName, userAvatar }: ChatViewProps) {
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // load conversations
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const data = await fetchConversationsApi(userId);
        setConversations(data);
      } catch (err) {
        console.error("Failed to fetch conversations:", err);
      }
    };
    load();
  }, [userId]);

  // load initial messages
  useEffect(() => {
    if (!selectedConversation) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchMessagesApi(selectedConversation, 0, PAGE_SIZE);
        setMessages(data.reverse()); // newest at bottom
        setPage(1);
        setHasMore(data.length === PAGE_SIZE);
        requestAnimationFrame(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "auto" });
          }
        });
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedConversation]);

  // auto clear error
  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop === 0 && hasMore && !loading) {
      setLoading(true);
      try {
        const more = await fetchMessagesApi(selectedConversation!, page, PAGE_SIZE);
        setMessages((prev) => [...more.reverse(), ...prev]);
        setPage((prev) => prev + 1);
        setHasMore(more.length === PAGE_SIZE);
        const prevHeight = target.scrollHeight;
        requestAnimationFrame(() => {
          const newHeight = target.scrollHeight;
          target.scrollTop = newHeight - prevHeight;
        });
      } catch (err) {
        console.error("Failed to load more messages:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  // send text + files
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && pendingFiles.length === 0) || !selectedConversation) return;
    try {
      if (newMessage.trim()) {
        const msg = await createTextMessageApi({
          conversationId: selectedConversation,
          senderId: userId,
          senderFullName: userName,
          senderImageUrl: userAvatar,
          content: newMessage,
        });
        setMessages((prev) => [...prev, msg]);
        setNewMessage("");
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        });
      }

      if (pendingFiles.length > 0) {
        const totalSize = pendingFiles.reduce((a, f) => a + f.size, 0);
        if (totalSize > MAX_TOTAL_SIZE) {
          setErrorMsg("Total size of all files exceeds 100MB.");
          setPendingFiles([]);
          return;
        }

        const valid = pendingFiles.filter((f) => f.size <= MAX_FILE_SIZE);
        const oversized = pendingFiles.filter((f) => f.size > MAX_FILE_SIZE);

        if (oversized.length > 0) {
          setErrorMsg(
            `Some files too large (>100MB): ${oversized.map((f) => f.name).join(", ")}`
          );
        }

        if (valid.length > 0) {
          try {
            const msgs = await createMediaMessagesApi(
              selectedConversation,
              userId,
              userName,
              userAvatar,
              valid
            );
            setMessages((prev) => [...prev, ...msgs]);
            requestAnimationFrame(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            });
          } catch (err: any) {
            setErrorMsg("Failed to send files.");
            console.error(err);
          }
        }
        setPendingFiles([]);
      }
    } catch (err) {
      console.error("send error:", err);
      setErrorMsg("Something went wrong.");
    }
  };

  // select files
  const handleSelectFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    const total = [...pendingFiles, ...newFiles].reduce((a, f) => a + f.size, 0);
    if (total > MAX_TOTAL_SIZE) {
      setErrorMsg("Total size exceeds 100MB.");
      return;
    }
    setPendingFiles((prev) => [...prev, ...newFiles]);
  };

  // render pending files preview
  const renderPendingFiles = () => (
    <div className="p-2 border-t bg-gray-50">
      <div className="flex flex-wrap gap-3">
        {pendingFiles.map((file, idx) => {
          const isImage = file.type.startsWith("image/");
          return (
            <div key={idx} className="relative w-28 h-28 flex items-center justify-center">
              {isImage ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <div className="border rounded-lg p-2 bg-white shadow-sm w-28 h-28 text-xs text-center flex flex-col justify-center break-words">
                  <div className="font-medium truncate underline">{file.name}</div>
                </div>
              )}
              <button
                type="button"
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  // helper to check image message
  const isImageMessage = (m: MessageResponse) => {
    if (m.type === "media") {
      try {
        const parsed = JSON.parse(m.content);
        return parsed.mediaType === "image";
      } catch {
        return false;
      }
    }
    return false;
  };

  // render message content
  const renderContent = (m: MessageResponse) => {
    if (m.type === "text") return <div>{m.content}</div>;
    if (m.type === "media") {
      try {
        const { url, mediaType, originalName } = JSON.parse(m.content);
        if (mediaType === "image") {
          return <img src={url} alt={originalName} className="max-w-[200px] rounded-lg" />;
        }
        if (mediaType === "audio") {
          return <audio controls src={url} className="max-w-xs" />;
        }
        if (mediaType === "file") {
          return (
            <div className="flex items-start gap-2">
              <FileText className="w-5 h-5 shrink-0" />
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-pre-wrap break-words underline"
              >
                {originalName || "Download"}
              </a>
            </div>
          );
        }
      } catch {
        return <div className="text-red-600">Invalid media</div>;
      }
    }
    return <div>{m.content}</div>;
  };

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
        {loading && <div className="text-center py-3 text-gray-500">Loading...</div>}
        {!loading && conversations.length === 0 && (
          <div className="text-center py-3 text-gray-500">No conversations</div>
        )}
        {conversations.map((c) => {
          const other =
            c.type === "private" ? c.members.find((m) => m.userId !== userId) : null;
          const displayName =
            c.type === "group"
              ? c.name || "Unnamed group"
              : other?.fullName || "Private chat";
          const displayImage =
            c.type === "group"
              ? c.imageUrl || DEFAULT_AVATAR
              : other?.imageUrl || DEFAULT_AVATAR;
          return (
            <div
              key={c.id}
              onClick={() => setSelectedConversation(c.id)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-200 ${
                selectedConversation === c.id ? "bg-gray-300" : ""
              }`}
            >
              <img
                src={displayImage}
                alt={displayName}
                className="w-10 h-10 rounded-full"
                onError={(e) => ((e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR)}
              />
              <div className="flex-1">
                <div className="font-medium">{displayName}</div>
                <div className="text-sm text-gray-500 truncate">
                  {c.lastMessage?.content || "No messages yet"}
                </div>
              </div>
            </div>
          );
        })}
      </aside>

      {/* Chat area */}
      <main className="flex-1 flex flex-col bg-white">
        {selectedConversation ? (
          <>
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-1"
              onScroll={handleScroll}
            >
              {messages.map((m, i) => {
                const isOwn = m.sender.userId === userId;
                const prev = messages[i - 1];
                const next = messages[i + 1];
                const isFirstInGroup = !prev || prev.sender.userId !== m.sender.userId;
                const isLastInGroup = !next || next.sender.userId !== m.sender.userId;
                const image = isImageMessage(m);

                return (
                  <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-0.5`}>
                    {!isOwn && (
                      <div className="flex items-end gap-2">
                        {isLastInGroup ? (
                          <img
                            src={m.sender.imageUrl || DEFAULT_AVATAR}
                            alt={m.sender.fullName}
                            className="w-8 h-8 rounded-full"
                            onError={(e) =>
                              ((e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR)
                            }
                          />
                        ) : (
                          <div className="w-8" />
                        )}
                        <div className="flex flex-col items-start">
                          {isFirstInGroup && (
                            <span className="text-xs text-gray-500 mb-1">
                              {m.sender.fullName}
                            </span>
                          )}
                          <div
                            className={`${image ? "" : "bg-gray-200 text-gray-900 rounded-2xl px-4 py-2"} max-w-xs break-words`}
                          >
                            {renderContent(m)}
                          </div>
                        </div>
                      </div>
                    )}
                    {isOwn && (
                      <div className="flex flex-col items-end">
                        <div
                          className={`${image ? "" : "bg-blue-500 text-white rounded-2xl px-4 py-2"} max-w-xs break-words`}
                        >
                          {renderContent(m)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {pendingFiles.length > 0 && renderPendingFiles()}
            {errorMsg && <div className="px-3 py-1 text-red-500 text-sm">{errorMsg}</div>}

            <div className="flex items-center gap-2 p-3 border-t">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border rounded-full px-4 py-2 outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <input
                type="file"
                multiple
                className="hidden"
                id="fileInput"
                onChange={(e) => handleSelectFiles(e.target.files)}
              />
              <label htmlFor="fileInput" className="cursor-pointer px-3 py-2 text-gray-600 hover:text-gray-900">
                📎
              </label>
              <button
                onClick={handleSendMessage}
                className="bg-blue-500 text-white px-4 py-2 rounded-full"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-2xl font-semibold">
            Welcome to JoFox
          </div>
        )}
      </main>
    </div>
  );
}
