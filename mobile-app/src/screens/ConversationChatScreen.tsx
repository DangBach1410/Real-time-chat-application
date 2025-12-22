// ConversationChatScreen.tsx
import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Linking,
} from "react-native";
import { useChatContext } from "../context/ChatContext";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  fetchConversations,
  fetchMessages,
  createTextMessage,
  type ConversationResponse,
  type MessageResponse,
} from "../api/chatApi";
import * as StompJs from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { normalizeImageUrl } from "../utils/image";
import { Video, Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useWindowDimensions, Modal } from "react-native";
import { DEFAULT_AVATAR } from "../constants/common";
import ChatHeader from "../components/ChatHeader";

const PAGE_SIZE = 20;

const styles = StyleSheet.create({
  row: { flexDirection: "row", marginVertical: 2, paddingHorizontal: 12 },
  avatarWrapper: { width: 32, justifyContent: "flex-end" },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  bubbleOwn: { backgroundColor: "#3b82f6", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleOther: { backgroundColor: "#f3f4f6", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  messageWrapper: { flex: 1, marginHorizontal: 8 },
  nameText: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  image: { width: 320, height: 320, borderRadius: 8 },
  videoBox: { width: 200, height: 200, backgroundColor: "#000", borderRadius: 8, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  mediaRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
});

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

// Top-level renderer for message content to keep MessageRow small and memo-friendly
const renderMessageContent = (m: MessageResponse, isOwn: boolean) => {
  switch (m.type) {
    case "text":
      return <Text style={{ color: isOwn ? "#fff" : "#000", fontSize: 14 }}>{m.content}</Text>;

    case "text-translation":
      return (
        <View style={{ flexDirection: "column" }}>
          <Text style={{ color: isOwn ? "#fff" : "#000", fontSize: 14 }}>{m.content}</Text>
          <Text style={{ fontSize: 11, fontStyle: "italic", marginTop: 4, alignSelf: "flex-end", color: isOwn ? "#ddd" : "#6b7280" }}>Google Translate</Text>
        </View>
      );

    case "notification":
      return (
        <View style={{ flexDirection: "row", justifyContent: "center", marginVertical: 8 }}>
          <View style={{ backgroundColor: "#e5e7eb", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 }}>
            <Text style={{ fontSize: 12, color: "#374151" }}>{isOwn ? `You ${m.content}` : `${m.sender?.fullName ?? ""} ${m.content}`}</Text>
          </View>
        </View>
      );

    case "video_call":
    case "audio_call": {
      const isVideo = m.type === "video_call";
      return (
        <TouchableOpacity style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: isVideo ? "#a855f7" : "#6366f1" }} onPress={() => console.log(`${isVideo ? "Video" : "Audio"} call clicked - implement later`)}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MaterialIcons name={isVideo ? "videocam" : "call"} size={20} color="#fff" />
            <Text style={{ fontWeight: "600", fontSize: 14, color: "#fff" }}>{isVideo ? "Video call" : "Audio call"}</Text>
          </View>
          <Text style={{ fontSize: 12, color: "#fff", opacity: 0.9 }}>Click to join call</Text>
        </TouchableOpacity>
      );
    }

    case "media":
      try {
        const parsed = JSON.parse(m.content);
        const { url, mediaType, originalName } = parsed;

        if (mediaType === "image") {
          return <ImageMessage url={normalizeImageUrl(url)} isOwn={isOwn} />;
        }

        if (mediaType === "audio") {
          return <AudioMessage url={url} isOwn={isOwn} />;
        }

        if (mediaType === "video") {
          return <VideoMessage url={url} isOwn={isOwn} />;
        }

        if (mediaType === "file") {
          return <FileMessage url={url} name={originalName} isOwn={isOwn} />;
        }
      } catch {
        return <Text style={{ color: "#dc2626", fontSize: 12 }}>Invalid media</Text>;
      }

    case "link":
      try {
        const meta = JSON.parse(m.content);
        return (
          <TouchableOpacity
            style={{
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 12,
              overflow: "hidden",
              maxWidth: "80%",
              alignSelf: isOwn ? "flex-end" : "flex-start",
              backgroundColor: isOwn ? "#2563eb" : "#f3f4f6",
            }}
            onPress={() => Linking.openURL(meta.url)}
          >
            {meta.image && <Image source={{ uri: meta.image }} style={{ width: "100%", height: 120 }} />}
            <View style={{ padding: 10 }}>
              {meta.title && <Text style={{ fontWeight: "600", fontSize: 13, color: isOwn ? "#fff" : "#000", marginBottom: 4 }} numberOfLines={2}>{meta.title}</Text>}
              {meta.description && <Text style={{ fontSize: 11, color: isOwn ? "#e0e7ff" : "#666", marginBottom: 6 }} numberOfLines={2}>{meta.description}</Text>}
              <Text style={{ fontSize: 11, color: isOwn ? "#93c5fd" : "#3b82f6", textDecorationLine: "underline" }} numberOfLines={1}>{meta.url}</Text>
            </View>
          </TouchableOpacity>
        );
      } catch {
        return (
          <TouchableOpacity onPress={() => Linking.openURL(m.content)} style={{ alignSelf: isOwn ? "flex-end" : "flex-start" }}>
            <Text style={{ color: isOwn ? "#93c5fd" : "#3b82f6", fontSize: 12, textDecorationLine: "underline" }}>{m.content}</Text>
          </TouchableOpacity>
        );
      }

    default:
      return <Text style={{ color: isOwn ? "#fff" : "#000", fontSize: 14 }}>{m.content}</Text>;
  }
};

// Image message with dynamic sizing and fullscreen viewer
function ImageMessage({ url, isOwn }: { url?: string; isOwn?: boolean }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const { width: screenWidth } = useWindowDimensions();

  useEffect(() => {
    if (!url) return;
    let mounted = true;
    Image.getSize(
      url,
      (w, h) => {
        if (!mounted) return;
        // cap to a more reasonable width so images don't dominate the chat
        const maxW = Math.min(screenWidth * 0.6, w, 320);
        const ratio = h / w;
        setSize({ width: maxW, height: Math.round(maxW * ratio) });
      },
      () => {
        if (!mounted) return;
        setSize({ width: Math.min(screenWidth * 0.6, 320), height: 200 });
      }
    );
    return () => {
      mounted = false;
    };
  }, [url, screenWidth]);

  return (
    <>
      {url ? (
        <View style={{ alignSelf: isOwn ? "flex-end" : "flex-start", marginVertical: 6 }}>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Image source={{ uri: url }} style={[{ width: size?.width || 200, height: size?.height || 200, borderRadius: 8 }, { resizeMode: "cover" }]} />
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={{ color: "#dc2626" }}>Invalid image</Text>
      )}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" }}>
          <TouchableOpacity style={{ position: "absolute", top: 40, right: 20 }} onPress={() => setModalVisible(false)}>
            <Text style={{ color: "#fff", fontSize: 18 }}>Close</Text>
          </TouchableOpacity>
          <Image source={{ uri: url }} style={{ width: screenWidth, height: screenWidth, resizeMode: "contain" }} />
        </View>
      </Modal>
    </>
  );
}

// Audio inline player (basic)
function AudioMessage({ url, isOwn }: { url?: string; isOwn?: boolean }) {
  const soundRef = useRef<any>(null);
  const [playing, setPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);

  const toggle = async () => {
    if (!url) return;
    try {
      if (!soundRef.current) {
        setLoadingAudio(true);
        const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
        soundRef.current = sound;
        setPlaying(true);
        setLoadingAudio(false);
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            setPlaying(false);
            soundRef.current = null;
          }
        });
      } else {
        if (playing) {
          await soundRef.current.pauseAsync();
          setPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setPlaying(true);
        }
      }
    } catch (err) {
      console.error("Audio play error:", err);
      setLoadingAudio(false);
    }
  };

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync?.();
        soundRef.current = null;
      }
    };
  }, []);

  return (
    <View style={{ alignSelf: isOwn ? "flex-end" : "flex-start", marginVertical: 6 }}>
      <TouchableOpacity style={styles.mediaRow} onPress={toggle}>
        <MaterialIcons name={playing ? "pause" : "play-arrow"} size={24} color="#000" />
        <Text style={{ fontSize: 12, color: "#000", marginLeft: 8 }}>{loadingAudio ? "Loading..." : playing ? "Playing" : (url ? "Play audio" : "Invalid audio")}</Text>
      </TouchableOpacity>
    </View>
  );
}

// Video inline player using expo-av Video
function VideoMessage({ url, isOwn }: { url?: string; isOwn?: boolean }) {
  const { width: screenWidth } = useWindowDimensions();
  const videoWidth = Math.min(screenWidth * 0.6, 640);
  const videoHeight = Math.round(videoWidth * (9 / 16));

  return (
    <View style={{ alignSelf: isOwn ? "flex-end" : "flex-start", marginVertical: 6 }}>
      <View style={{ width: videoWidth, height: videoHeight }}>
        {url ? (
          <Video source={{ uri: url }} style={{ width: videoWidth, height: videoHeight }} useNativeControls resizeMode="contain" />
        ) : (
          <View style={{ width: videoWidth, height: videoHeight, justifyContent: "center", alignItems: "center" }}><Text style={{ color: "#fff" }}>Invalid video</Text></View>
        )}
      </View>
    </View>
  );
}

// File message: download and share
async function downloadAndShareAsync(url: string, name?: string) {
  try {
    const filename = name ? name.replace(/[^a-z0-9_.-]/gi, "_") : `file_${Date.now()}`;
    const base: string = (FileSystem as any).cacheDirectory ?? FileSystem.documentDirectory ?? "";
    const localUri = `${base}${filename}`;

    // use DownloadResumable to avoid deprecated downloadAsync signature
    const downloadResumable = FileSystem.createDownloadResumable(url, localUri);
    const result = await downloadResumable.downloadAsync();
    const uri = (result as any).uri ?? localUri;

    if (!(await Sharing.isAvailableAsync())) {
      // fallback to open
      if (uri) Linking.openURL(uri);
      return;
    }
    await Sharing.shareAsync(uri, { dialogTitle: name || filename });
  } catch (err) {
    console.error("Download/share failed:", err);
  }
}

function FileMessage({ url, name, isOwn }: { url?: string; name?: string; isOwn?: boolean }) {
  return (
    <View style={{ alignSelf: isOwn ? "flex-end" : "flex-start", marginVertical: 6 }}>
      <TouchableOpacity style={styles.fileRow} onPress={() => url && downloadAndShareAsync(url, name)}>
        <MaterialIcons name="description" size={20} color="#000" />
        <Text style={{ fontSize: 12, color: "#000", textDecorationLine: "underline" }}>{name || "Download file"}</Text>
      </TouchableOpacity>
    </View>
  );
}

// Memoized row component to avoid unnecessary re-renders
type MessageRowProps = {
  m: MessageResponse;
  isOwn: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
};

const MessageRow = memo(({ m, isOwn, isFirstInGroup, isLastInGroup }: MessageRowProps) => {
  // decide whether this message should have bubble background
  let shouldHaveBg = true;
  if (m.type === "notification") shouldHaveBg = false;
  if (["video_call", "audio_call", "link"].includes(m.type)) shouldHaveBg = false;
  if (m.type === "media") {
    try {
      const parsed = JSON.parse(m.content);
      if (["image", "video", "audio"].includes(parsed.mediaType)) shouldHaveBg = false;
    } catch {}
  }

  return (
    <View style={[styles.row, { justifyContent: isOwn ? "flex-end" : "flex-start" }]}> 
      {!isOwn && (
        <View style={styles.avatarWrapper}>
          {isLastInGroup ? (
            <Image source={{ uri: normalizeImageUrl(m.sender.imageUrl) || DEFAULT_AVATAR }} style={styles.avatar} />
          ) : null}
        </View>
      )}

      <View style={[styles.messageWrapper, { alignItems: isOwn ? "flex-end" : "flex-start", marginHorizontal: isOwn ? 0 : 8 }]}>
        {!isOwn && isFirstInGroup && <Text style={styles.nameText}>{m.sender.fullName}</Text>}

        <View style={{ maxWidth: "80%" }}>
          <View style={shouldHaveBg ? (isOwn ? styles.bubbleOwn : styles.bubbleOther) : undefined}>
            {renderMessageContent(m, isOwn)}
          </View>
        </View>
      </View>
    </View>
  );
}, (prev, next) => prev.m.id === next.m.id && prev.isOwn === next.isOwn && prev.isFirstInGroup === next.isFirstInGroup && prev.isLastInGroup === next.isLastInGroup);

export default function ConversationChatScreen() {
  const { user, currentUserId } = useChatContext();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { conversationId } = route.params;

  const [conversation, setConversation] = useState<ConversationResponse | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [isTyping, setIsTyping] = useState(false);
  const stompClientRef = useRef<StompJs.Client | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flatListRef = useRef<FlatList | null>(null);
  const isLoadingRef = useRef(false);
  const contentHeightRef = useRef(0);

  // Load conversation details
  useEffect(() => {
    const loadConversation = async () => {
      try {
        const convs = await fetchConversations(currentUserId, 0, 100);
        const conv = convs.find((c) => c.id === conversationId);
        if (conv) {
          setConversation(conv);
        }
      } catch (err) {
        console.error("Failed to load conversation:", err);
      }
    };
    loadConversation();
  }, [conversationId, currentUserId]);

  // Load initial messages
  useEffect(() => {
    if (!conversationId) return;

    const loadMessages = async () => {
      setLoading(true);
      try {
        const data = await fetchMessages(conversationId, 0, PAGE_SIZE);
        setMessages(
          data.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        );
        setPage(1);
        setHasMore(data.length === PAGE_SIZE);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 500);
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [conversationId]);

  // Connect to WebSocket
  useEffect(() => {
    if (!conversationId) return;

    const socket = new SockJS("http://10.0.2.2:8083/ws");
    const client = new StompJs.Client({
      webSocketFactory: () => socket as any,
      debug: (str) => console.log(str),
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      console.log("STOMP connected");
      client.subscribe(`/topic/conversations/${conversationId}`, (message) => {
        try {
          const newMsg = JSON.parse(message.body) as MessageResponse;
          // Use mergeAndSortMessages to deduplicate and maintain order (same as ChatView)
          setMessages((prev) => mergeAndSortMessages(prev, [newMsg]));
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        } catch (err) {
          console.error("Failed to parse message:", err);
        }
      });

      client.subscribe(`/topic/conversations/${conversationId}/typing`, (message) => {
        try {
          const data = JSON.parse(message.body);
          setTypingUsers((prev) => ({
            ...prev,
            [data.userId]: data.typing,
          }));
        } catch (err) {
          console.error("Failed to parse typing event:", err);
        }
      });
    };

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
      console.log("STOMP disconnected");
    };
  }, [conversationId]);

  const sendTypingEvent = (typing: boolean) => {
    if (!stompClientRef.current || !conversationId) return;
    stompClientRef.current.publish({
      destination: "/app/typing",
      body: JSON.stringify({
        conversationId: conversationId,
        userId: currentUserId,
        typing: typing,
      }),
    });
  };

  const handleInputChange = (text: string) => {
    setNewMessage(text);

    if (!isTyping) {
      setIsTyping(true);
      sendTypingEvent(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingEvent(false);
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    try {
      await createTextMessage({
        conversationId: conversationId,
        senderId: currentUserId,
        senderFullName: user.fullName,
        senderImageUrl: user.imageUrl || DEFAULT_AVATAR,
        content: newMessage,
        type: "text",
      });

      // Don't add message to state here - let WebSocket handle it to avoid duplicates
      setNewMessage("");
      setIsTyping(false);
      sendTypingEvent(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error("Failed to send message:", err);
      setErrorMsg("Failed to send message");
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  const handleLoadMore = async () => {
    if (!hasMore || loading || !conversationId) return;

    setLoading(true);
    try {
      const more = await fetchMessages(conversationId, page, PAGE_SIZE);
      if (more.length > 0) {
        setMessages((prev) => mergeAndSortMessages(prev, more));
        setPage((prev) => prev + 1);
        setHasMore(more.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more messages:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load more and preserve scroll position when prepending older messages
  const loadMorePreserveScroll = async (prevContentHeight: number) => {
    if (!hasMore || loading || !conversationId) return;
    isLoadingRef.current = true;
    try {
      const more = await fetchMessages(conversationId, page, PAGE_SIZE);
      if (more.length > 0) {
        setMessages((prev) => mergeAndSortMessages(prev, more));
        setPage((prev) => prev + 1);
        setHasMore(more.length === PAGE_SIZE);

        // after layout update, adjust scroll so user stays at the same message
        setTimeout(() => {
          const newH = contentHeightRef.current || 0;
          const diff = newH - prevContentHeight;
          if (diff > 0) {
            flatListRef.current?.scrollToOffset({ offset: diff, animated: false });
          }
        }, 80);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more messages:", err);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;

    // update current content height for later calculations
    contentHeightRef.current = contentSize.height;

    // Check if scrolled to top (to load older messages)
    const isAtTop = contentOffset.y <= 50; // 50px threshold

    if (isAtTop && !loading && hasMore && !isLoadingRef.current) {
      // capture previous content height
      const prevHeight = contentSize.height;
      loadMorePreserveScroll(prevHeight);
    }
  };
  const renderMessageItem = useCallback(({ item: m }: { item: MessageResponse }) => {
    const isOwn = m.sender.userId === currentUserId;

    if (m.type === "notification") return renderMessageContent(m, isOwn);

    const idx = messages.indexOf(m);
    const prev = messages[idx - 1];
    const next = messages[idx + 1];
    const isFirstInGroup = !prev || prev.sender.userId !== m.sender.userId;
    const isLastInGroup = !next || next.sender.userId !== m.sender.userId;

    return <MessageRow m={m} isOwn={isOwn} isFirstInGroup={isFirstInGroup} isLastInGroup={isLastInGroup} />;
  }, [messages, currentUserId]);

  // Auto clear error
  useEffect(() => {
    if (errorMsg) {
      const timeout = setTimeout(() => setErrorMsg(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [errorMsg]);

  const activeTypingUsers = Object.entries(typingUsers)
    .filter(([_, isTyping]) => isTyping)
    .map(([uid]) => {
      return conversation?.members.find((m) => m.userId === uid);
    })
    .filter(Boolean);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#fff" }}
      keyboardVerticalOffset={90}
    >
      <ChatHeader
        conversation={conversation}
        onBackPress={() => navigation.goBack()}
      />

      <View style={{ flex: 1 }}>
        {loading && !messages.length ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.id}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={21}
            removeClippedSubviews={Platform.OS === "android"}
            ListHeaderComponent={
              loading ? (
                <ActivityIndicator
                  size="small"
                  color="#3b82f6"
                  style={{ marginVertical: 8 }}
                />
              ) : null
            }
            ListEmptyComponent={
              !loading ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ color: "#9ca3af", fontSize: 14 }}>
                    No messages yet
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        {/* Typing Indicator */}
        {activeTypingUsers.length > 0 && (
          <View style={{ paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 4 }}>
              {activeTypingUsers.map((u) => (
                <Image
                  key={u!.userId}
                  source={{ uri: normalizeImageUrl(u!.imageUrl) || DEFAULT_AVATAR }}
                  style={{ width: 20, height: 20, borderRadius: 10 }}
                />
              ))}
            </View>
            <Text style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>
              {activeTypingUsers.length === 1
                ? `${activeTypingUsers[0]!.fullName} is typing...`
                : "Someone is typing..."}
            </Text>
          </View>
        )}

        {errorMsg && (
          <View
            style={{
              backgroundColor: "#fee2e2",
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: "#dc2626", fontSize: 12 }}>{errorMsg}</Text>
          </View>
        )}

        {/* Input Area */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 12,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: "#e5e7eb",
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          <TouchableOpacity
            style={{
              width: 36,
              height: 36,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialIcons name="attach-file" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              width: 36,
              height: 36,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialIcons name="mic" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TextInput
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 14,
              maxHeight: 100,
            }}
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={handleInputChange}
            multiline={true}
          />

          <TouchableOpacity
            onPress={handleSendMessage}
            style={{
              backgroundColor: "#3b82f6",
              width: 36,
              height: 36,
              borderRadius: 18,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialIcons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
