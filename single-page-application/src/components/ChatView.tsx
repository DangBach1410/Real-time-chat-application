// src/components/ChatView.tsx
import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react"; // icon dịch
import { translateMessage } from "../helpers/translationApi"; // API helper mới
import * as StompJs from "@stomp/stompjs";
import SockJS from "sockjs-client";
import ConfirmModal from "./ConfirmModal";
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
import ChatCrossBar from "./ChatCrossBar";
import NewGroupModal from "./NewGroupModal";
import { getFriends, type GetFriendResponse } from "../helpers/friendApi";
import { Users, Smile } from "lucide-react";
import { Phone, Video } from "lucide-react"
import { Mic, Square } from "lucide-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useNavigate } from "react-router-dom";
import { searchConversations } from "../helpers/chatApi";
import {
  fetchConversationMembers,
  fetchConversationMedia,
  fetchConversationFiles,
  fetchConversationLinks,
} from "../helpers/chatApi";
import { fetchMessageContext, fetchOldMessages, fetchNewMessages } from "../helpers/chatApi";
import ConversationDetailsModal from "./ConversationDetailsModal";
import { startOrJoinCall, type CallRequest } from "../helpers/callApi";
import { API_URL } from "../constants/common";

interface ChatViewProps {
  userId: string;
  userName: string;
  userAvatar: string;
  userLanguageCode?: string;
  conversationId?: string;
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
  userLanguageCode,
  conversationId,
}: ChatViewProps) {
  // Helper: merge two message arrays, remove duplicates, sort ascending by createdAt
  const mergeAndSortMessages = (
    existing: MessageResponse[],
    incoming: MessageResponse[]
  ) => {
    const map = new Map<string, MessageResponse>();
    // add all messages into map (keyed by id) so duplicates are removed
    existing.concat(incoming).forEach((m) => map.set(m.id, m));
    const arr = Array.from(map.values());
    arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return arr;
  };

  const [conversations, setConversations] = useState<ConversationResponse[]>(
    []
  );
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [convPage, setConvPage] = useState(1);
  const [convHasMore, setConvHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [usersPresence, setUsersPresence] = useState<Record<string, number>>(
    {}
  );
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [friends, setFriends] = useState<GetFriendResponse[]>([]);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ConversationResponse[]>([]);
  const [searchPage, setSearchPage] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [activeConversation, setActiveConversation] = useState<ConversationResponse | null>(null);
  const [incomingForDetails, setIncomingForDetails] = useState<MessageResponse | null>(null);
  
  const pendingNavigationRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const skipInitialLoadRef = useRef(false);
  const contextModeRef = useRef(false);
  const contextPivotRef = useRef<string | null>(null);
  const prevMessagesRef = useRef<MessageResponse[] | null>(null);
  const prevPageRef = useRef<number | null>(null);
  const prevHasMoreRef = useRef<boolean | null>(null);
  // track whether context-mode can fetch older/newer pages
  const contextHasMoreOlderRef = useRef<boolean>(true);
  const contextHasMoreNewerRef = useRef<boolean>(true);
  const stompClient = useRef<StompJs.Client | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [highlightQuery, setHighlightQuery] = useState<string>("");

  const navigate = useNavigate();

  useEffect(() => {
    setSearchResults([]);
    setSearchPage(0);
    setSearchHasMore(true);

    if (searchQuery.trim() === "") return;

    const delayDebounce = setTimeout(() => {
      loadSearchResults(0);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const loadSearchResults = async (page: number) => {
    if (!searchHasMore || searchLoading) return;
    setSearchLoading(true);
    try {
      const res = await searchConversations(userId, searchQuery, page, PAGE_SIZE);
      if (page === 0) setSearchResults(res);
      else setSearchResults((prev) => [...prev, ...res]);
      setSearchHasMore(res.length === PAGE_SIZE);
      setSearchPage(page + 1);

      // Fetch presence for search results
      const userIds = res
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

      setUsersPresence((prev) => ({
        ...prev,
        ...presenceResults,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Khi props conversationId thay đổi, set selectedConversation
  useEffect(() => {
    if (conversationId && conversationId !== selectedConversation) {
      setSelectedConversation(conversationId);
    }
  }, [conversationId]);

  // Khi selectedConversation thay đổi, cập nhật URL
  useEffect(() => {
    if (selectedConversation) {
      navigate(`/chat/${selectedConversation}`);
    }
  }, [selectedConversation, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current?.contains(event.target as Node)
      ) {
        return; 
      }
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!isRecording || !recordingStartTime) return;

    const interval = setInterval(() => {
      setRecordDuration(Math.floor((Date.now() - recordingStartTime) / 1000));
    }, 500);

    return () => clearInterval(interval);
  }, [isRecording, recordingStartTime]);

  // Load friends
  useEffect(() => {
    const loadFriends = async () => {
      try {
        const res = await getFriends(userId);
        setFriends(res.data || []);
      } catch (err) {
        console.error("Failed to load friends", err);
      }
    };
    loadFriends();
  }, [userId]);

  // Kết nối WebSocket presence
  useEffect(() => {
    if (!userId) return;

    const socket = new SockJS(`${API_URL}:8762/ws-presence`);
    // const socket = new SockJS("/ws-presence");
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

  // Kết nối WebSocket global conversation updates
  useEffect(() => {
    if (!userId) return;

    const socket = new SockJS(`${API_URL}:8762/ws`);
    // const socket = new SockJS("/ws");
    const client = new StompJs.Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log("Global STOMP:", str),
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      console.log("Connected to /topic/conversations/user/" + userId);
      client.subscribe(`/topic/conversations/user/${userId}`, (message) => {
        try {
          const updatedConversation: ConversationResponse = JSON.parse(message.body);
          upsertConversation(updatedConversation);
          console.log("Received conversation update:", updatedConversation);
        } catch (err) {
          console.error("Failed to parse global conversation update", err);
        }
      });
    };

    client.activate();

    return () => {
      client.deactivate();
      console.log("Disconnected from global topic");
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

    const socket = new SockJS(`${API_URL}:8762/ws`);
    // const socket = new SockJS("/ws");
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
            setMessages((prev) => mergeAndSortMessages(prev, [msg]));
            // keep last incoming message so details panel can react if open
            setIncomingForDetails(msg);
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
    // If we set this flag (jump), skip the default initial fetch which would overwrite context
    if (skipInitialLoadRef.current) {
      skipInitialLoadRef.current = false;
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchMessages(selectedConversation, 0, PAGE_SIZE);
        // Ensure messages are chronological (oldest -> newest)
        setMessages(data.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
        setPage(1);
        setHasMore(data.length === PAGE_SIZE);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 500);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedConversation]);

  // Jump to a specific message (called from details/search)
  const handleJumpToMessage = async (m: MessageResponse, q?: string) => {
    if (!m) return;

    // save current messages so we can restore when search/details closed
    prevMessagesRef.current = messages;
    prevPageRef.current = page;
    prevHasMoreRef.current = hasMore;

    // save highlight info (keyword + message id) so UI can render highlighted pivot
    if (q) {
      setHighlightedMessageId(m.id);
      setHighlightQuery(q);
    } else {
      setHighlightedMessageId(m.id);
      setHighlightQuery("");
    }

    // prevent the default initial fetch from overwriting our context load
    skipInitialLoadRef.current = true;
    contextModeRef.current = true;
    contextPivotRef.current = m.id;

    // switch conversation first (this triggers websocket subscribe but we skip the initial fetch)
    setSelectedConversation(m.conversationId);
    // set activeConversation if possible
    const conv = conversations.find((c) => c.id === m.conversationId) || null;
    setActiveConversation(conv);

    // initialize context-mode fetch availability
    contextHasMoreOlderRef.current = true;
    contextHasMoreNewerRef.current = true;

    setLoading(true);
    try {
      const ctx = await fetchMessageContext(m.conversationId, m.id, PAGE_SIZE, PAGE_SIZE);
      const sorted = ctx.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(sorted);
      // after loading a context, we consider hasMore true (can still fetch older/newer via id)
      setHasMore(true);

      // scroll to the pivot message after render
      setTimeout(() => {
        const el = document.getElementById(`msg-${m.id}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
      } catch (err) {
      console.error("Failed to fetch message context:", err);
    } finally {
      setLoading(false);
    }
  };

  // Called when the details/search modal closes — restore messages if we jumped earlier
  const handleSearchClosed = () => {
    if (prevMessagesRef.current) {
      setMessages(prevMessagesRef.current);
      setPage(prevPageRef.current ?? 0);
      setHasMore(prevHasMoreRef.current ?? true);
      prevMessagesRef.current = null;
      prevPageRef.current = null;
      prevHasMoreRef.current = null;
      contextModeRef.current = false;
      contextPivotRef.current = null;
      // reset context fetch availability so we don't block future loads
      contextHasMoreOlderRef.current = true;
      contextHasMoreNewerRef.current = true;
      // clear highlight state
      setHighlightedMessageId(null);
      setHighlightQuery("");

      // scroll to latest message after restoring old list
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  };

  // auto clear error
  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  const handleConversationUpdated = (updated: ConversationResponse) => {
    setConversations(prev =>
      prev.map(c => (c.id === updated.id ? updated : c))
    );
  };

  const upsertConversation = (updated: ConversationResponse) => { 
    setConversations(prev => {
      const lastMsg = updated.lastMessage;  
      // Nếu lastMessage là notification rời nhóm của chính user -> loại khỏi sidebar
      if (
        lastMsg &&
        lastMsg.sender.userId === userId &&
        lastMsg.type === "notification" &&
        lastMsg.content === "left the conversation"
      ) {
        setSelectedConversation(prev => (prev === updated.id ? null : prev));
        return prev.filter(c => c.id !== updated.id);
      }

      const exists = prev.find(c => c.id === updated.id);

      if (exists) {
        return [updated, ...prev.filter(c => c.id !== updated.id)];
      } else {
        return [updated, ...prev];
      }
    });
  };

  const currentConversation = conversations.find(c => c.id === selectedConversation);

  // scroll load more
  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // If at top: load older messages
    if (target.scrollTop === 0 && !loading) {
      // guard: if in context mode but we've already determined there are no older messages, skip
      if (contextModeRef.current) {
        if (!contextHasMoreOlderRef.current) return;
      } else {
        if (!hasMore) return;
      }

      setLoading(true);
      try {
        if (contextModeRef.current) {
          // load older messages relative to current first message
          const firstId = messages[0]?.id;
          if (firstId) {
            // preserve scroll position: capture height before adding older messages
            const prevHeight = target.scrollHeight;
            const older = await fetchOldMessages(selectedConversation!, firstId, PAGE_SIZE);
            if (older.length > 0) {
              setMessages((prev) => mergeAndSortMessages(prev, older));
              // after DOM updates, adjust scrollTop so the user stays at the same message
              requestAnimationFrame(() => {
                const newHeight = target.scrollHeight;
                // move scroll down by the amount content grew
                target.scrollTop = newHeight - prevHeight;
              });
            } else {
              // no more older messages in context mode
              contextHasMoreOlderRef.current = false;
            }
          } else {
            contextHasMoreOlderRef.current = false;
          }
        } else if (hasMore) {
          const more = await fetchMessages(
            selectedConversation!,
            page,
            PAGE_SIZE
          );
          // Merge fetched page into existing messages, dedupe and keep chronological order
          setMessages((prev) => mergeAndSortMessages(prev, more));
          setPage((prev) => prev + 1);
          setHasMore(more.length === PAGE_SIZE);

          const prevHeight = target.scrollHeight;
          requestAnimationFrame(() => {
            const newHeight = target.scrollHeight;
            target.scrollTop = newHeight - prevHeight;
          });
        }
      } catch (err) {
        console.error("Failed to load more messages:", err);
      } finally {
        setLoading(false);
      }
    }

    // If near bottom and in context mode: load newer messages
    const nearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50;
    if (nearBottom && contextModeRef.current && !loading) {
      // guard: if we've already determined there are no newer messages, skip
      if (!contextHasMoreNewerRef.current) return;

      setLoading(true);
      try {
        const lastId = messages[messages.length - 1]?.id;
        if (lastId) {
          const newer = await fetchNewMessages(selectedConversation!, lastId, PAGE_SIZE);
          if (newer.length > 0) {
            setMessages((prev) => mergeAndSortMessages(prev, newer));
          } else {
            // no more newer messages in context mode
            contextHasMoreNewerRef.current = false;
          }
        } else {
          contextHasMoreNewerRef.current = false;
        }
      } catch (err) {
        console.error("Failed to load newer messages:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSidebarScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const threshold = 50; // gần đáy
    const nearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < threshold;

    if (!nearBottom) return;

    // scroll search results
    if (searchQuery.trim() !== "") {
      if (searchHasMore && !searchLoading) {
        loadSearchResults(searchPage);
      }
      return;
    }

    // scroll default conversations
    if (convHasMore && !loading) {
      setLoading(true);
      try {
        const more = await fetchConversations(userId, convPage, PAGE_SIZE);
        setConversations((prev) => [...prev, ...more]);
        setConvPage((prev) => prev + 1);
        setConvHasMore(more.length === PAGE_SIZE);

        // Fetch presence for newly loaded conversations
        const userIds = more
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

        setUsersPresence((prev) => ({
          ...prev,
          ...presenceResults,
        }));
      } catch (err) {
        console.error("Failed to load more conversations:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleTranslation = async (m: MessageResponse) => {
    try {
      // nếu chưa có userLanguageCode thì show modal
      if (!userLanguageCode) {
        pendingNavigationRef.current = () => {
          navigate("/profile/edit");
        };
        setShowConfirmModal(true);
        return;
      }

      // nếu đã dịch rồi thì không gọi API
      const translatedExists = messages.some((msg) => msg.id === `${m.id}-translated`);
      if (translatedExists) return;

      const translated = await translateMessage(m, userLanguageCode);

      setMessages((prev) => {
        const index = prev.findIndex((msg) => msg.id === m.id);
        if (index === -1) return prev;

        const newMessages = [...prev];
        newMessages.splice(index + 1, 0, translated);
        return newMessages;
      });
    } catch (err) {
      console.error("Translation failed:", err);
    }
  };
      

  // thêm phía dưới cùng của các hàm handle khác
  const handleToggleRecording = async () => {
    if (isRecording) {
      // đang ghi thì dừng
      mediaRecorder?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], `recording_${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setPendingFiles((prev) => [...prev, file]);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingStartTime(Date.now());
    } catch (err) {
      console.error("Microphone access denied:", err);
      setErrorMsg("Microphone access denied.");
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
  const renderContent = (m: MessageResponse, isOwn: boolean) => {
    if (m.type === "text") {
      // if this message is highlighted (jumped-to), highlight keyword occurrences
      if (m.id === highlightedMessageId && highlightQuery) {
        return <div>{renderHighlightedContent(m.content, highlightQuery)}</div>;
      }
      return <div>{m.content}</div>;
    }
    if (m.type === "text-translation") {
      return (
        <div className="flex flex-col">
          <div>{m.content}</div>
            <div
              className={`
                text-[11px] italic font-medium mt-1 self-end
                ${isOwn ? "text-gray-100 opacity-90" : "text-gray-600"}
              `}
            >
              Google Translate
            </div>
        </div>
      );
    }
    if (m.type === "video_call" || m.type === "audio_call") {
      const isVideo = m.type === "video_call";

      // join call giống ChatCrossBar
      const handleJoinCall = async () => {
        try {
          // tìm conversation tương ứng (dùng currentConversation nếu có)
          const conv = conversations.find((c) => c.id === m.conversationId) || currentConversation;
          if (!conv) throw new Error("Conversation not found");

          const currentUser = conv.members.find((mem) => mem.userId === userId);
          if (!currentUser) throw new Error("User not found in conversation");

          const payload: CallRequest = {
            type: isVideo ? "video" : "audio",
            conversationId: conv.id,
            callerId: userId,
            callerName: currentUser.fullName,
            callerImage: currentUser.imageUrl || DEFAULT_AVATAR,
          };

          // yêu cầu server khởi / tham gia cuộc gọi
          const res = await startOrJoinCall(payload);

          // mở cửa sổ call (giữ cùng format như ChatCrossBar)
          const url = `/call?channel=${conv.id}&type=${isVideo ? "video" : "audio"}&agoraUid=${res.agoraUid}`;
          window.open(url, "_blank", "width=1000,height=700");
        } catch (err) {
          console.error("❌ Failed to join call:", err);
          alert("Failed to join call. Please try again.");
        }
      };

      return (
        <div
          onClick={handleJoinCall}
          className={`flex flex-col items-center justify-center gap-2 px-4 py-3 rounded-2xl text-white cursor-pointer ${
            isVideo ? "bg-purple-700 hover:bg-purple-800" : "bg-indigo-700 hover:bg-indigo-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {isVideo ? (
              <Video className="w-6 h-6 text-white-600" />
            ) : (
              <Phone className="w-4 h-4 text-white-600" />
            )}
            <span className="font-semibold text-base">
              {isVideo ? "Video call" : "Audio call"}
            </span>
          </div>
          <span className="text-sm opacity-90">Click to join call</span>
        </div>
      );
    }
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

  function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function renderHighlightedContent(text: string, q: string) {
    try {
      const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
      return <>{parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <span key={i} className="bg-yellow-200 font-semibold rounded">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}</>;
    } catch {
      return <>{text}</>;
    }
  }

  // helper for last message preview
  const getLastMessagePreview = (c: ConversationResponse) => {
    if (!c.lastMessage) return "No messages yet";
    const { type, sender, content } = c.lastMessage;
    const isOwn = sender.userId === userId;
    const senderName = isOwn ? "You" : sender.fullName || "";

    if (type === "notification") {
      return `${senderName} ${content}`;
    }

    if (type === "text") {
      return `${senderName}: ${content}`;
    }
    
    if (type === "video_call") {
      return isOwn ? "You started a video call" : `${senderName} started a video call`;
    }
    
    if (type === "audio_call") {
      return isOwn ? "You started an audio call" : `${senderName} started an audio call`;
    }
    
    if (type === "link") {
      return isOwn ? "You sent a link" : `${senderName} sent a link`;
    }
    
    if (type === "media") {
      try {
        const parsed = JSON.parse(content);
        if (parsed.mediaType === "image")
          return isOwn ? "You sent an image" : `${senderName} sent an image`;
        if (parsed.mediaType === "audio")
          return isOwn ? "You sent an audio" : `${senderName} sent an audio`;
        if (parsed.mediaType === "file")
          return isOwn ? "You sent a file" : `${senderName} sent a file`;
        if (parsed.mediaType === "video")
          return isOwn ? "You sent a video" : `${senderName} sent a video`;
        return isOwn ? "You sent a media" : `${senderName} sent a media`;
      } catch {
        return isOwn ? "You sent a media" : `${senderName} sent a media`;
      }
    }
    
    return isOwn ? "You sent a message" : `${senderName} sent a message`;
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

  function isGroupOnline(group: ConversationResponse, currentUserId: string, usersPresence: Record<string, number>): boolean {
    return group.members.some(member => 
      member.userId !== currentUserId && // loại bỏ chính user
      (() => {
        const lastSeen = usersPresence[member.userId];
        if (!lastSeen) return false;
        const diffMinutes = (Date.now() - lastSeen) / 60000;
        return diffMinutes <= 5; // online nếu < 5 phút
      })()
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-96 bg-gray-100 border-r flex flex-col h-full">
        {/* Sticky Header */}
        <div className="flex flex-col sticky top-0 z-10 bg-gray-100 pt-2 pb-2 border-b">
          {/* New Group Button */}
          <button
            onClick={() => setShowNewGroupModal(true)}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 mb-2 flex items-center justify-center gap-2"
          >
            <Users className="w-5 h-5" />
            <span>New Group</span>
          </button>

          {/* Search Input */}
          <div className="px-4 mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Scrollable Conversation List */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden"
          onScroll={handleSidebarScroll}
        >
          {loading && (
            <div className="text-center py-3 text-gray-500">Loading...</div>
          )}
          {!loading && (searchResults.length === 0 && conversations.length === 0) && (
            <div className="text-center py-3 text-gray-500">No conversations</div>
          )}

              {(searchResults.length > 0 ? searchResults : conversations).map((c) => {
            const other = c.type === "private"
              ? c.members.find((m) => m.userId !== userId)
              : null;

            const displayName = c.type === "group"
              ? c.name || "Unnamed group"
              : other?.fullName || "Private chat";

            const displayImage = c.type === "group"
              ? c.imageUrl || DEFAULT_AVATAR
              : other?.imageUrl || DEFAULT_AVATAR;

            const presenceId = c.type === "group" ? "" : other?.userId || "";
            const lastSeen = presenceId ? usersPresence[presenceId] : null;
            const diffMinutes = lastSeen ? Math.floor((Date.now() - lastSeen) / 60000) : null;
            const isOnline = c.type === "group"
              ? isGroupOnline(c, userId, usersPresence)
              : diffMinutes !== null && diffMinutes <= 5;

            return (
                <div
                key={c.id}
                onClick={() => {
                  // switching manually to a conversation -> exit context/jump mode
                  contextModeRef.current = false;
                  contextPivotRef.current = null;
                  // clear any saved jump state
                  prevMessagesRef.current = null;
                  prevPageRef.current = null;
                  prevHasMoreRef.current = null;
                  // reset context fetch availability
                  contextHasMoreOlderRef.current = true;
                  contextHasMoreNewerRef.current = true;
                  setSelectedConversation(c.id);
                  setActiveConversation(c);
                  // setShowDetails(true);
                  setSearchResults([]); // Xóa kết quả search
                  setSearchQuery("");   // Reset ô search
                }}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-200 ${
                  selectedConversation === c.id ? "bg-gray-300" : ""
                }`}
              >
                <div className="relative w-10 h-10 shrink-0">
                  {c.type === "group" && !c.imageUrl ? (
                    <div className="relative w-10 h-10">
                      {c.members.slice(-2).map((m, idx) => (
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
                  ) : (
                    <img
                      src={displayImage}
                      alt={displayName}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) =>
                        ((e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR)
                      }
                    />
                  )}

                  {/* Online status */}
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${
                      isOnline ? "bg-green-500" : ""
                    }`}
                    title={
                      c.type === "group"
                        ? isOnline
                          ? "Online"
                          : "Offline"
                        : lastSeen !== null
                        ? isOnline
                          ? "Online"
                          : `Active ${diffMinutes} minutes ago`
                        : "Offline"
                    }
                  />
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
        </div>
      </aside>

      <main className="flex-1 flex bg-white">  
        {/* Chat Area*/}
        <div className={`flex flex-col transition-all duration-300 ${
          showDetails ? "w-2/3" : "w-full"
        }`}>
          {selectedConversation ? (
            <>
              {currentConversation && (
                <ChatCrossBar
                  conversation={conversations.find(c => c.id === selectedConversation)!}
                  currentUserId={userId}
                  lastSeen={
                    (() => {
                      const conv = conversations.find(c => c.id === selectedConversation);
                      if (!conv || conv.type === "group") return null;
                      const other = conv.members.find((m) => m.userId !== userId);
                      return other ? usersPresence[other.userId] : null;
                    })()
                  }
                  usersPresence={usersPresence}
                  onOpenDetails={() => {
                    setActiveConversation(currentConversation);
                    setShowDetails(true);
                  }}
                />
              )}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-1"
                onScroll={handleScroll}
              >
                {messages.map((m, i) => {
                  const isOwn = m.sender.userId === userId;
                  const isHighlighted = m.id === highlightedMessageId;
                  // skip notification messages when determining grouping
                  let prev = undefined as MessageResponse | undefined;
                  for (let pi = i - 1; pi >= 0; pi--) {
                    if (messages[pi].type !== "notification") {
                      prev = messages[pi];
                      break;
                    }
                  }

                  let next = undefined as MessageResponse | undefined;
                  for (let ni = i + 1; ni < messages.length; ni++) {
                    if (messages[ni].type !== "notification") {
                      next = messages[ni];
                      break;
                    }
                  }

                  const isFirstInGroup = !prev || prev.sender.userId !== m.sender.userId;
                  const isLastInGroup = !next || next.sender.userId !== m.sender.userId;

                  if (m.type === "notification") {
                    const displayText = isOwn
                      ? `You ${m.content}`
                      : `${m.sender?.fullName ?? ""} ${m.content}`;
                    return (
                      <div key={m.id} className="flex justify-center my-2">
                        <div className="bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded-full shadow-sm">
                          {displayText}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div id={`msg-${m.id}`} key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-0.5 ${isHighlighted ? "font-semibold" : ""}`}>
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

                          <div className="flex flex-col items-start relative group">
                            {isFirstInGroup && (
                              <span className="text-xs text-gray-500 mb-1">{m.sender.fullName}</span>
                            )}

                            {/* ✅ Bọc thêm một div flex để đặt bubble và Globe cùng hàng */}
                            <div className="flex items-center gap-1">
                              {m.type === "video_call" || m.type === "audio_call" ? (
                                renderContent(m, isOwn)
                              ) : m.type === "link" ? (
                                renderContent(m, isOwn)
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
                                      ? ""
                                      : "bg-gray-100 rounded-2xl px-3 py-2 max-w-xs whitespace-pre-wrap break-words"
                                  }`}
                                >
                                  {renderContent(m, isOwn)}
                                </div>
                              )}

                              {m.type === "text" && (
                                <button
                                  className="text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition"
                                  onClick={() => handleTranslation(m)}
                                >
                                  <Globe className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}


                      {isOwn && (
                        <div className="flex items-end gap-2">
                          <div className="flex flex-col items-end relative group">
                            {m.type === "video_call" || m.type === "audio_call" ? (
                              renderContent(m, isOwn)
                            ) : m.type === "link" ? (
                              renderContent(m, isOwn)
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
                                    ? ""
                                    : "bg-blue-500 text-white rounded-2xl px-3 py-2 max-w-xs whitespace-pre-wrap break-words"
                                }`}
                              >
                                {renderContent(m, isOwn)}
                              </div>
                            )}
                            {m.type === "text" && (
                              <button
                                className={`absolute top-1/2 -translate-y-1/2 
                                  -left-5
                                  opacity-0 group-hover:opacity-100 
                                  text-gray-400 hover:text-gray-700`}
                                  onClick={() => handleTranslation(m)}
                              >
                                <Globe className="w-4 h-4" />
                              </button>
                            )}
                          </div>
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
                {/* Nút micro ghi âm */}
                <button
                  type="button"
                  onClick={handleToggleRecording}
                  className={`p-1 rounded-full transition-colors duration-200 ${
                    isRecording
                      ? "bg-red-500 text-white hover:bg-red-600" 
                      : "text-gray-600"  
                  }`}
                  title={isRecording ? "Stop recording" : "Record voice message"}
                >
                  {isRecording ? (
                    // icon Stop
                    <Square className="w-6 h-6" />
                  ) : (
                    // icon Microphone
                    <Mic className="w-6 h-6" />
                  )}
                </button>

                {isRecording && (
                  <span className="text-sm text-red-600 ml-1 animate-pulse">
                    ● Recording... {recordDuration}s
                  </span>
                )}
                  
                  <button
                    type="button"
                    ref={buttonRef}
                    onClick={() => setShowEmojiPicker(prev => !prev)}
                    className="p-2 text-gray-500"
                  >
                    <Smile className="w-5 h-5 text-gray-600" />
                  </button>

                  {showEmojiPicker && (
                    <div ref={emojiPickerRef} className="absolute bottom-16 left-4 z-50">
                      <Picker
                        data={data}
                        onEmojiSelect={(emoji: any) => {
                          setNewMessage(prev => prev + emoji.native);
                        }}
                      />
                    </div>
                  )}
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
        </div>
        {/* Details Panel */}
        {showDetails && activeConversation && (
          // <div className="border-l bg-gray-50 overflow-y-auto">
              <ConversationDetailsModal
                conversation={activeConversation}
                currentUserId={userId}
                onClose={() => { setShowDetails(false); handleSearchClosed(); }}
                fetchMembers={fetchConversationMembers}
                fetchMedia={fetchConversationMedia}
                fetchFiles={fetchConversationFiles}
                fetchLinks={fetchConversationLinks}
                onConversationUpdated={handleConversationUpdated}
                onJumpToMessage={handleJumpToMessage}
                onSearchClosed={handleSearchClosed}
                incomingMessage={
                  incomingForDetails && activeConversation && incomingForDetails.conversationId === activeConversation.id
                    ? incomingForDetails
                    : null
                }
              />
          // </div>
        )}        
      </main>
      {showNewGroupModal && (
        <NewGroupModal
          currentUserId={userId}
          userAvatar={userAvatar}
          friends={friends}
          onClose={() => setShowNewGroupModal(false)}
          onCreated={(conv) => {
            setSelectedConversation(conv.id);
          }}
        />
      )}
      {showConfirmModal && (
        <ConfirmModal
          title="Language not set"
          message="You need to set your preferred language before translating. Do you want to update your profile now?"
          onCancel={() => {
            setShowConfirmModal(false);
            pendingNavigationRef.current = null;
          }}
          onConfirm={() => {
            setShowConfirmModal(false);
            pendingNavigationRef.current?.();
            pendingNavigationRef.current = null;
          }}
        />
      )}
    </div>
  );
}
