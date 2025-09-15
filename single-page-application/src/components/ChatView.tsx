// src/components/ChatView.tsx
import { useEffect, useRef, useState } from "react";
import * as StompJs from "@stomp/stompjs";
import SockJS from "sockjs-client";
import {
  fetchConversations,
  fetchMessages,
  createTextMessage,
  createMediaMessages,
  type ConversationResponse,
  type MessageResponse,
} from "../helpers/chatApi";
import { updatePresence, getPresence } from "../helpers/presenceApi";
import { DEFAULT_AVATAR } from "../constants/common";
import { FileText, Paperclip, Send } from "lucide-react";

interface ChatViewProps {
  userId: string;
  userName: string;
  userAvatar: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB
const PAGE_SIZE = 20;

function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export default function ChatView({
  userId,
  userName,
  userAvatar,
}: ChatViewProps) {
  const [conversations, setConversations] = useState<ConversationResponse[]>(
    []
  );
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [usersPresence, setUsersPresence] = useState<Record<string, number>>(
    {}
  );
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const stompClient = useRef<StompJs.Client | null>(null);

  // Kết nối WebSocket presence
  useEffect(() => {
    if (!userId) return;

    const socket = new SockJS("http://localhost:8085/ws-presence");
    const client = new StompJs.Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log("Presence WS:", str),
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      console.log("Presence STOMP connected");
      client.subscribe("/topic/presence", (message) => {
        try {
          const { userId: uid, lastSeen } = JSON.parse(message.body);
          setUsersPresence((prev) => ({
            ...prev,
            [uid]: lastSeen,
          }));
        } catch (err) {
          console.error("Failed to parse presence message", err);
        }
      });
    };

    client.activate();

    return () => {
      client.deactivate();
      console.log("Presence STOMP disconnected");
    };
  }, [userId]);

  // load conversations
  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      try {
        const data = await fetchConversations(userId);
        setConversations(data);

        const userIds = data
          .map((c) =>
            c.type === "private"
              ? c.members.find((m) => m.userId !== userId)?.userId
              : c.members.map((m) => m.userId)
          )
          .flat()
          .filter(Boolean) as string[];

        const presenceResults: Record<string, number> = {};
        await Promise.all(
          userIds.map(async (id) => {
            try {
              const res = await getPresence(id);
              presenceResults[id] = res.data.lastSeen;
            } catch (err) {
              console.error("Failed to fetch presence for", id);
            }
          })
        );

        setUsersPresence(presenceResults);
      } catch (err) {
        console.error("Failed to fetch conversations:", err);
      }
    };

    load();
  }, [userId]);

  // heartbeat presence
  useEffect(() => {
    if (!userId) return;

    const sendHeartbeat = async () => {
      try {
        await updatePresence(userId);
      } catch (err) {
        console.error("Presence heartbeat failed", err);
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId]);

  // Khi selectedConversation thay đổi, connect websocket
  useEffect(() => {
    if (!selectedConversation) return;

    if (stompClient.current && stompClient.current.connected) {
      stompClient.current.deactivate();
    }

    const socket = new SockJS("http://localhost:8083/ws");
    const client = new StompJs.Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log(str),
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      console.log("STOMP connected");
      client.subscribe(
        `/topic/conversations/${selectedConversation}`,
        (message) => {
          try {
            const msg: MessageResponse = JSON.parse(message.body);
            setMessages((prev) => [...prev, msg]);
            requestAnimationFrame(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            });
          } catch (err) {
            console.error("Failed to parse websocket message", err);
          }
        }
      );
      client.subscribe(
        `/topic/conversations/${selectedConversation}/typing`,
        (message) => {
          try {
            const { userId: typingUserId, typing } = JSON.parse(message.body);
            if (typingUserId === userId) return; // bỏ qua self

            setTypingUsers((prev) => ({
              ...prev,
              [typingUserId]: typing,
            }));
          } catch (err) {
            console.error("Failed to parse typing event", err);
          }
        }
      );
    };

    client.activate();
    stompClient.current = client;

    return () => {
      client.deactivate();
      console.log("STOMP disconnected");
    };
  }, [selectedConversation]);

  // load initial messages
  useEffect(() => {
    if (!selectedConversation) return;

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchMessages(selectedConversation, 0, PAGE_SIZE);
        setMessages(data.reverse());
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

  // scroll load more
  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop === 0 && hasMore && !loading) {
      setLoading(true);
      try {
        const more = await fetchMessages(
          selectedConversation!,
          page,
          PAGE_SIZE
        );
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
    if (
      (!newMessage.trim() && pendingFiles.length === 0) ||
      !selectedConversation
    )
      return;

    try {
      if (newMessage.trim()) {
        const isLink = isValidUrl(newMessage.trim());
        await createTextMessage({
          conversationId: selectedConversation,
          senderId: userId,
          senderFullName: userName,
          senderImageUrl: userAvatar,
          content: newMessage.trim(),
          type: isLink ? "link" : "text",
        });

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
            `Some files too large (>100MB): ${oversized
              .map((f) => f.name)
              .join(", ")}`
          );
        }

        if (valid.length > 0) {
          try {
            await createMediaMessages(
              selectedConversation,
              userId,
              userName,
              userAvatar,
              valid
            );

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
            <div
              key={idx}
              className="relative w-28 h-28 flex items-center justify-center"
            >
              {isImage ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <div className="border rounded-lg p-2 bg-white shadow-sm w-28 h-28 text-xs text-center flex flex-col justify-center break-words">
                  <div className="font-medium truncate underline">
                    {file.name}
                  </div>
                </div>
              )}
              <button
                type="button"
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                onClick={() =>
                  setPendingFiles((prev) => prev.filter((_, i) => i !== idx))
                }
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  // render message content
  const renderContent = (m: MessageResponse) => {
    if (m.type === "text") return <div>{m.content}</div>;

    if (m.type === "link") {
      try {
        const meta = JSON.parse(m.content);
        return (
          <a
            href={meta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col max-w-xs rounded-2xl overflow-hidden cursor-pointer border shadow-sm bg-gray-50 hover:bg-gray-100 transition"
          >
            {meta.image && (
              <img
                src={meta.image}
                alt=""
                className="w-full max-h-48 object-cover"
              />
            )}
            <div className="px-3 py-2">
              {meta.title && (
                <div className="font-semibold text-sm text-gray-900">
                  {meta.title}
                </div>
              )}
              {meta.description && (
                <div className="text-xs text-gray-600 line-clamp-2">
                  {meta.description}
                </div>
              )}
              <div className="text-xs text-blue-600 underline mt-1 break-words">
                {meta.url}
              </div>
            </div>
          </a>
        );
      } catch {
        return (
          <a
            href={m.content}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline bg-gray-50 px-3 py-2 rounded-2xl inline-block"
          >
            {m.content}
          </a>
        );
      }
    }

    if (m.type === "media") {
      try {
        const { url, mediaType, originalName } = JSON.parse(m.content);
        if (mediaType === "image") {
          return (
            <img
              src={url}
              alt={originalName}
              className="max-w-[200px] rounded-lg"
            />
          );
        }
        if (mediaType === "audio") {
          return <audio controls src={url} className="max-w-xs" />;
        }
        if (mediaType === "video") {
          return (
            <video
              controls
              src={url}
              className="max-w-[250px] max-h-[300px] rounded-lg object-contain"
            >
              Sorry, your browser does not support embedded videos.
            </video>
          );
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

  // helper for last message preview
  const getLastMessagePreview = (c: ConversationResponse) => {
    if (!c.lastMessage) return "No messages yet";
    const { type, sender, content } = c.lastMessage;

    if (type === "text") return content;
    if (type === "link") return `${sender.fullName} have send a link`;
    if (type === "media") {
      try {
        const parsed = JSON.parse(content);
        if (parsed.mediaType === "image")
          return `${sender.fullName} have send an image`;
        if (parsed.mediaType === "audio")
          return `${sender.fullName} have send an audio`;
        if (parsed.mediaType === "file")
          return `${sender.fullName} have send a file`;
        if (parsed.mediaType === "video")
          return `${sender.fullName} have send a video`;
        return `${sender.fullName} have send a media`;
      } catch {
        return `${sender.fullName} have send a media`;
      }
    }
    return `${sender.fullName} have send a message`;
  };

  if (!userId) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-500">
        Loading user info...
      </div>
    );
  }

  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendTypingEvent = (typing: boolean) => {
    if (!stompClient.current || !selectedConversation) return;
    stompClient.current.publish({
      destination: "/app/typing",
      body: JSON.stringify({
        conversationId: selectedConversation,
        userId: userId,
        typing: typing,
      }),
    });
  };

  const [isTyping, setIsTyping] = useState(false);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    // Nếu chưa gửi "typing" thì gửi 1 lần
    if (!isTyping) {
      sendTypingEvent(true);
      setIsTyping(true);
    }

    // reset timeout mỗi lần gõ
    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      sendTypingEvent(false);
      setIsTyping(false);
    }, 2000); // sau 2s không gõ thì coi như đã dừng
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-100 border-r overflow-y-auto">
        {loading && (
          <div className="text-center py-3 text-gray-500">Loading...</div>
        )}
        {!loading && conversations.length === 0 && (
          <div className="text-center py-3 text-gray-500">No conversations</div>
        )}

        {conversations.map((c) => {
          const other =
            c.type === "private"
              ? c.members.find((m) => m.userId !== userId)
              : null;
          const displayName =
            c.type === "group"
              ? c.name || "Unnamed group"
              : other?.fullName || "Private chat";
          const displayImage =
            c.type === "group"
              ? c.imageUrl || DEFAULT_AVATAR
              : other?.imageUrl || DEFAULT_AVATAR;

          const presenceId = c.type === "group" ? "" : other?.userId || "";
          const lastSeen = presenceId ? usersPresence[presenceId] : null;
          const diffMinutes = lastSeen
            ? Math.floor((Date.now() - lastSeen) / 60000)
            : null;
          const isOnline = diffMinutes !== null && diffMinutes <= 5;

          return (
            <div
              key={c.id}
              onClick={() => setSelectedConversation(c.id)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-200 ${
                selectedConversation === c.id ? "bg-gray-300" : ""
              }`}
            >
              <div className="relative w-10 h-10 shrink-0">
                <img
                  src={displayImage}
                  alt={displayName}
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) =>
                    ((e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR)
                  }
                />
                {presenceId && (
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      isOnline ? "bg-green-500" : "bg-gray-400"
                    }`}
                    title={
                      isOnline
                        ? "Online"
                        : lastSeen !== null
                        ? `Active ${diffMinutes} minutes ago`
                        : "Offline"
                    }
                  />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium">{displayName}</div>
                <div className="text-sm text-gray-500 truncate">
                  {getLastMessagePreview(c)}
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

                return (
                  <div
                    key={m.id}
                    className={`flex ${
                      isOwn ? "justify-end" : "justify-start"
                    } mb-0.5`}
                  >
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

                        {m.type === "link" ? (
                          renderContent(m)
                        ) : (
                          <div
                            className={`${
                              m.type === "media" &&
                              (() => {
                                try {
                                  const { mediaType } = JSON.parse(m.content);
                                  return ["image", "video", "audio"].includes(mediaType);
                                } catch {
                                  return false;
                                }
                              })()
                                ? "" // media thì không bọc bubble
                                : "bg-gray-100 rounded-2xl px-3 py-2 max-w-xs whitespace-pre-wrap break-words"
                            }`}
                          >
                            {renderContent(m)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isOwn && (
                    <div className="flex items-end gap-2">
                      <div className="flex flex-col items-end">
                        {m.type === "link" ? (
                          renderContent(m)
                        ) : (
                          <div
                            className={`${
                              m.type === "media" &&
                              (() => {
                                try {
                                  const { mediaType } = JSON.parse(m.content);
                                  return ["image", "video", "audio"].includes(mediaType);
                                } catch {
                                  return false;
                                }
                              })()
                                ? "" // media thì không bọc bubble
                                : "bg-blue-500 text-white rounded-2xl px-3 py-2 max-w-xs whitespace-pre-wrap break-words"
                            }`}
                          >
                            {renderContent(m)}
                          </div>
                        )}
                      </div>
                      {isLastInGroup ? (
                        <img
                          src={userAvatar || DEFAULT_AVATAR}
                          alt={userName}
                          className="w-8 h-8 rounded-full"
                          onError={(e) =>
                            ((e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR)
                          }
                        />
                      ) : (
                        <div className="w-8" />
                      )}
                    </div>
                  )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {pendingFiles.length > 0 && renderPendingFiles()}
            {errorMsg && (
              <div className="p-2 text-sm text-red-600">{errorMsg}</div>
            )}

            {(() => {
              const activeTyping = Object.entries(typingUsers)
                .filter(([_, isTyping]) => isTyping)
                .map(([uid]) => {
                  const conv = conversations.find((c) =>
                    c.members.some((m) => m.userId === uid)
                  );
                  return conv?.members.find((m) => m.userId === uid);
                })
                .filter(Boolean);

              if (activeTyping.length === 0) return null;

              return (
                <div className="flex items-center justify-end gap-2 px-3 py-1">
                  {/* avatar group */}
                  <div className="flex -space-x-2">
                    {activeTyping.map((member) => (
                      <img
                        key={member!.userId}
                        src={member!.imageUrl || DEFAULT_AVATAR}
                        alt={member!.fullName}
                        className="w-6 h-6 rounded-full border-2 border-white"
                      />
                    ))}
                  </div>

                  {/* dots */}
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              );
            })()}

            {/* Input */}
            <div className="p-3 border-t flex items-center gap-2">
              <label className="cursor-pointer">
                <Paperclip className="w-6 h-6 text-gray-500" />
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleSelectFiles(e.target.files)}
                />
              </label>
              <input
                type="text"
                className="flex-1 border rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type a message..."
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                className="bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-gray-500">
            Select a conversation
          </div>
        )}
      </main>
    </div>
  );
}
