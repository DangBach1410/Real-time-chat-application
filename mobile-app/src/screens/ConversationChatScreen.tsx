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
  Alert,
  Pressable,
  TouchableWithoutFeedback,
} from "react-native";
import { useChatContext } from "../context/ChatContext";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  fetchConversations,
  fetchMessages,
  createTextMessage,
  fetchMessageContext,
  fetchOldMessages,
  fetchNewMessages,
  type ConversationResponse,
  type MessageResponse,
} from "../api/chatApi";
import { translateMessage } from "../api/translationApi";
import * as StompJs from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { normalizeImageUrl } from "../utils/image";
import { DEFAULT_AVATAR } from "../constants/common";
import ChatHeader from "../components/ChatHeader";
import AudioMessage from "../components/AudioMessage";
import ImageMessage from "../components/ImageMessage";
import VideoMessage from "../components/VideoMessage";
import FileMessage from "../components/FileMessage";
import TypingIndicator from "../components/TypingIndicator";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { createMediaMessages } from "../api/chatApi";
import { useChatAudioRecorder } from "../hooks/useAudioRecorder";
import * as Clipboard from "expo-clipboard";
import { SafeAreaView } from "react-native-safe-area-context";

const PAGE_SIZE = 20;
const LINK_CARD_WIDTH = 300;

function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", marginVertical: 2, paddingHorizontal: 12 },
  avatarWrapper: { width: 32, justifyContent: "flex-end" },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  bubbleOwn: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleOther: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageWrapper: { flex: 1, marginHorizontal: 8 },
  nameText: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  image: { width: 320, height: 320, borderRadius: 8 },
  videoBox: {
    width: 200,
    height: 200,
    backgroundColor: "#000",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  mediaRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionMenuContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  actionMenuBox: {
    minWidth: 140,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  actionMenuItem: { paddingVertical: 10 },
  actionMenuText: { fontSize: 16, color: "#111827" },
});

// Helper: merge two message arrays, remove duplicates, sort ascending by createdAt
const mergeAndSortMessages = (
  existing: MessageResponse[],
  incoming: MessageResponse[],
) => {
  const map = new Map<string, MessageResponse>();
  existing.concat(incoming).forEach((m) => map.set(m.id, m));
  const arr = Array.from(map.values());
  arr.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return arr;
};

// Helper to render highlighted text
const renderHighlightedText = (text: string, query: string, isOwn: boolean) => {
  if (!query)
    return (
      <Text style={{ color: isOwn ? "#fff" : "#000", fontSize: 14 }}>
        {text}
      </Text>
    );

  const regex = new RegExp(`(${query})`, "gi");
  const parts = text.split(regex);

  return (
    <Text style={{ color: isOwn ? "#fff" : "#000", fontSize: 14 }}>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <Text key={index} style={{ backgroundColor: "yellow" }}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
};

// Top-level renderer for message content to keep MessageRow small and memo-friendly
const renderMessageContent = (
  m: MessageResponse,
  isOwn: boolean,
  highlightedMessageId: string | null,
  highlightQuery: string,
) => {
  switch (m.type) {
    case "text":
      return renderHighlightedText(
        m.content,
        m.id === highlightedMessageId ? highlightQuery : "",
        isOwn,
      );

    case "text-translation":
      return (
        <View style={{ flexDirection: "column" }}>
          <Text style={{ color: isOwn ? "#fff" : "#000", fontSize: 14 }}>
            {m.content}
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontStyle: "italic",
              marginTop: 4,
              alignSelf: "flex-end",
              color: isOwn ? "#ddd" : "#6b7280",
            }}
          >
            Google Translate
          </Text>
        </View>
      );

    case "notification":
      return (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginVertical: 1,
          }}
        >
          <View
            style={{
              backgroundColor: "#e5e7eb",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
            }}
          >
            <Text style={{ fontSize: 12, color: "#374151" }}>
              {isOwn
                ? `You ${m.content}`
                : `${m.sender?.fullName ?? ""} ${m.content}`}
            </Text>
          </View>
        </View>
      );

    case "video_call":
    case "audio_call": {
      const isVideo = m.type === "video_call";
      return (
        <TouchableOpacity
          style={{
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: isVideo ? "#a855f7" : "#6366f1",
          }}
          onPress={() =>
            console.log(
              `${isVideo ? "Video" : "Audio"} call clicked - implement later`,
            )
          }
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MaterialIcons
              name={isVideo ? "videocam" : "call"}
              size={20}
              color="#fff"
            />
            <Text style={{ fontWeight: "600", fontSize: 14, color: "#fff" }}>
              {isVideo ? "Video call" : "Audio call"}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: "#fff", opacity: 0.9 }}>
            Click to join call
          </Text>
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
        return (
          <Text style={{ color: "#dc2626", fontSize: 12 }}>Invalid media</Text>
        );
      }

    case "link":
      try {
        const meta = JSON.parse(m.content);
        return <LinkPreview meta={meta} isOwn={isOwn} />;
      } catch {
        return (
          <TouchableOpacity onPress={() => Linking.openURL(m.content)}>
            <Text
              style={{
                color: "#2563eb",
                textDecorationLine: "underline",
                fontSize: 12,
              }}
            >
              {m.content}
            </Text>
          </TouchableOpacity>
        );
      }

    default:
      return (
        <Text style={{ color: isOwn ? "#fff" : "#000", fontSize: 14 }}>
          {m.content}
        </Text>
      );
  }
};

// Link preview component with load/error logging and fallback
function LinkPreview({ meta, isOwn }: { meta: any; isOwn: boolean }) {
  const imageUri = meta.image;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => Linking.openURL(meta.url)}
      style={{
        width: LINK_CARD_WIDTH,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        backgroundColor: "#f9fafb",
        alignSelf: isOwn ? "flex-end" : "flex-start",
      }}
    >
      {imageUri ? (
        <>
          <Image
            source={{ uri: imageUri }}
            style={{
              width: LINK_CARD_WIDTH,
              aspectRatio: 16 / 9,
              resizeMode: "cover",
            }}
          />
        </>
      ) : null}

      <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
        {meta.title && (
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#111827",
              marginBottom: 4,
            }}
            numberOfLines={2}
          >
            {meta.title}
          </Text>
        )}

        {meta.description && (
          <Text
            style={{ fontSize: 11, color: "#4b5563", marginBottom: 6 }}
            numberOfLines={2}
          >
            {meta.description}
          </Text>
        )}

        <Text
          style={{
            fontSize: 11,
            color: "#2563eb",
            textDecorationLine: "underline",
          }}
          numberOfLines={1}
        >
          {meta.url}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Memoized row component to avoid unnecessary re-renders
type MessageRowProps = {
  m: MessageResponse;
  isOwn: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  highlightedMessageId: string | null;
  highlightQuery: string;
  onLongPress: (
    m: MessageResponse,
    layout: { x: number; y: number; width: number; height: number },
  ) => void;
};

const MessageRow = memo(
  ({
    m,
    isOwn,
    isFirstInGroup,
    isLastInGroup,
    highlightedMessageId,
    highlightQuery,
    onLongPress,
  }: MessageRowProps) => {
    // decide whether this message should have bubble background
    let shouldHaveBg = true;
    if (m.type === "notification") shouldHaveBg = false;
    if (["video_call", "audio_call", "link"].includes(m.type))
      shouldHaveBg = false;
    if (m.type === "media") {
      try {
        const parsed = JSON.parse(m.content);
        if (["image", "video", "audio"].includes(parsed.mediaType))
          shouldHaveBg = false;
      } catch {}
    }

    // Only text messages are long-press actionable
    const isActionable = m.type === "text";

    const Bubble = (
      <View
        style={
          shouldHaveBg
            ? isOwn
              ? styles.bubbleOwn
              : styles.bubbleOther
            : undefined
        }
      >
        {renderMessageContent(m, isOwn, highlightedMessageId, highlightQuery)}
      </View>
    );

    return (
      <View
        style={[
          styles.row,
          { justifyContent: isOwn ? "flex-end" : "flex-start" },
        ]}
      >
        {!isOwn && (
          <View style={styles.avatarWrapper}>
            {isLastInGroup ? (
              <Image
                source={{
                  uri: normalizeImageUrl(m.sender.imageUrl) || DEFAULT_AVATAR,
                }}
                style={styles.avatar}
              />
            ) : null}
          </View>
        )}

        <View
          style={[
            styles.messageWrapper,
            {
              alignItems: isOwn ? "flex-end" : "flex-start",
              marginHorizontal: isOwn ? 0 : 8,
            },
          ]}
        >
          {!isOwn && isFirstInGroup && (
            <Text style={styles.nameText}>{m.sender.fullName}</Text>
          )}

          <View
            style={{
              maxWidth: "80%",
              flexDirection: "row",
              alignItems: "flex-end",
            }}
          >
            {isActionable ? (
              <Pressable
                onLongPress={(e) => {
                  const { pageX, pageY } = e.nativeEvent;
                  // pass a compact layout; openActionMenu will decide which side to show
                  onLongPress(m, {
                    x: pageX - 70,
                    y: pageY - 10,
                    width: 140,
                    height: 0,
                  });
                }}
                delayLongPress={300}
              >
                {Bubble}
              </Pressable>
            ) : (
              Bubble
            )}
          </View>
        </View>
      </View>
    );
  },
  (prev, next) =>
    prev.m.id === next.m.id &&
    prev.isOwn === next.isOwn &&
    prev.isFirstInGroup === next.isFirstInGroup &&
    prev.isLastInGroup === next.isLastInGroup &&
    prev.highlightedMessageId === next.highlightedMessageId &&
    prev.highlightQuery === next.highlightQuery,
);

export default function ConversationChatScreen() {
  const { user, currentUserId } = useChatContext();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { conversation, usersPresence, jumpMessage, jumpQuery } =
    route.params as {
      conversation: ConversationResponse;
      usersPresence: Record<string, number>;
      jumpMessage?: MessageResponse;
      jumpQuery?: string;
    };
  const conversationId = conversation.id;
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const [highlightQuery, setHighlightQuery] = useState<string>("");
  const [translatingIds, setTranslatingIds] = useState<string[]>([]);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [actionMenuSide, setActionMenuSide] = useState<"left" | "right">(
    "right",
  );
  const [selectedMessageForAction, setSelectedMessageForAction] =
    useState<MessageResponse | null>(null);
  const stompClientRef = useRef<StompJs.Client | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flatListRef = useRef<FlatList | null>(null);
  const isLoadingRef = useRef(false);
  const contentHeightRef = useRef(0);
  const contextModeRef = useRef(false);
  const contextPivotRef = useRef<string | null>(null);
  const contextHasMoreOlderRef = useRef<boolean>(true);
  const contextHasMoreNewerRef = useRef<boolean>(true);
  const audioRecorder = useChatAudioRecorder();
  const [firstLoad, setFirstLoad] = useState(true);

  const getUserLanguage = () => {
    return (
      (user &&
        (user.languageCode ||
          (user as any).language ||
          (user as any).preferredLanguage)) ||
      null
    );
  };

  // Open action menu for a message
  const openActionMenu = (
    m: MessageResponse,
    layout: { x: number; y: number; width: number; height: number },
  ) => {
    const isOwn = m.sender.userId === currentUserId;
    setSelectedMessageForAction(m);
    setActionMenuPosition({
      x: layout.x,
      y: layout.y,
    });
    setActionMenuSide(isOwn ? "left" : "right");
    setActionMenuVisible(true);
  };

  // Close action menu
  const closeActionMenu = () => {
    setActionMenuVisible(false);
    setSelectedMessageForAction(null);
    setActionMenuPosition(null);
  };

  // Load initial messages or jump to message
  useEffect(() => {
    if (!conversationId) return;

    const loadMessages = async () => {
      setLoading(true);
      try {
        if (jumpMessage) {
          contextModeRef.current = true;
          contextPivotRef.current = jumpMessage.id;
          contextHasMoreOlderRef.current = true;
          contextHasMoreNewerRef.current = true;
          const ctx = await fetchMessageContext(
            conversationId,
            jumpMessage.id,
            PAGE_SIZE,
            PAGE_SIZE,
          );
          const sorted = ctx.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
          setMessages(sorted);
          setHighlightedMessageId(jumpMessage.id);
          setHighlightQuery(jumpQuery || "");
          setTimeout(() => {
            const index = sorted.findIndex((m) => m.id === jumpMessage.id);
            if (index !== -1) {
              flatListRef.current?.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.5,
              });
            }
          }, 1000);
        } else {
          contextModeRef.current = false;
          contextPivotRef.current = null;
          contextHasMoreOlderRef.current = false;
          contextHasMoreNewerRef.current = false;
          const data = await fetchMessages(conversationId, 0, PAGE_SIZE);
          setMessages(
            data.sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            ),
          );
          setPage(1);
          setHasMore(data.length === PAGE_SIZE);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 1000);
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        setLoading(false);
        setTimeout(() => {
          setFirstLoad(false);
        }, 3000);
      }
    };

    loadMessages();
  }, [conversationId, jumpMessage, jumpQuery]);

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
          setMessages((prev) => mergeAndSortMessages(prev, [newMsg]));
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 1000);
        } catch (err) {
          console.error("Failed to parse message:", err);
        }
      });

      client.subscribe(
        `/topic/conversations/${conversationId}/typing`,
        (message) => {
          try {
            const { userId: typingUserId, typing } = JSON.parse(message.body);
            if (typingUserId === currentUserId) return; // ignore self

            setTypingUsers((prev) => ({
              ...prev,
              [typingUserId]: typing,
            }));
          } catch (err) {
            console.error("Failed to parse typing event", err);
          }
        },
      );
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

  const assetToFile = (asset: any) =>
    ({
      uri: asset.uri,
      name: asset.fileName || asset.uri.split("/").pop() || "file",
      type: asset.mimeType || "application/octet-stream",
    }) as any;

  const handlePickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) return;

    try {
      const files = result.assets.map(assetToFile);

      await createMediaMessages(
        conversationId,
        currentUserId,
        user.fullName,
        user.imageUrl || DEFAULT_AVATAR,
        files,
      );

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 1000);
    } catch (err) {
      console.error("Send media failed:", err);
      setErrorMsg("Failed to send media");
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const files = result.assets.map(assetToFile);

      await createMediaMessages(
        conversationId,
        currentUserId,
        user.fullName,
        user.imageUrl || DEFAULT_AVATAR,
        files,
      );

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 1000);
    } catch (err) {
      console.error("Pick file failed:", err);
      setErrorMsg("Failed to send file");
    }
  };

  const handleMicPress = async () => {
    if (audioRecorder.isRecording) {
      const uri = await audioRecorder.stop();
      if (!uri) return;

      const file = {
        uri,
        name: `audio_${Date.now()}.m4a`,
        type: "audio/m4a",
      } as any;

      await createMediaMessages(
        conversationId,
        currentUserId,
        user.fullName,
        user.imageUrl || DEFAULT_AVATAR,
        [file],
      );

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 1000);
    } else {
      audioRecorder.start();
    }
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
      if (newMessage.trim()) {
        const isLink = isValidUrl(newMessage.trim());
        await createTextMessage({
          conversationId: conversationId,
          senderId: currentUserId,
          senderFullName: user.fullName,
          senderImageUrl: user.imageUrl || DEFAULT_AVATAR,
          content: newMessage.trim(),
          type: isLink ? "link" : "text",
        });

        setNewMessage("");
        setIsTyping(false);
        sendTypingEvent(false);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 1000);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setErrorMsg("Failed to send message");
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  // Translation handler (mobile) - follows same behavior as web
  const handleTranslation = async (m: MessageResponse) => {
    if (!m) return;

    const lang = getUserLanguage();
    if (!lang) {
      Alert.alert(
        "Language not set",
        "You need to set your preferred language before translating. Do you want to update your profile now?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Set now",
            onPress: () => navigation.navigate("ProfileEdit"),
          },
        ],
      );
      return;
    }

    // skip if translation already exists
    const translatedExists = messages.some(
      (msg) => msg.id === `${m.id}-translated`,
    );
    if (translatedExists) return;

    // mark translating
    setTranslatingIds((prev) => [...prev, m.id]);

    try {
      const translated = await translateMessage(m, lang);

      setMessages((prev) => {
        const index = prev.findIndex((msg) => msg.id === m.id);
        if (index === -1) return prev;

        const newMessages = [...prev];
        newMessages.splice(index + 1, 0, translated);
        return newMessages;
      });

      // scroll to show translated message
      setTimeout(() => {
        const idx = messages.findIndex((msg) => msg.id === m.id);
        if (idx !== -1)
          flatListRef.current?.scrollToIndex({
            index: idx + 1,
            animated: true,
            viewPosition: 0.5,
          });
      }, 300);
    } catch (err) {
      console.error("Translation failed:", err);
      setErrorMsg("Translation failed");
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setTranslatingIds((prev) => prev.filter((id) => id !== m.id));
    }
  };

  // Load more and preserve scroll position when prepending older messages
  const loadMorePreserveScroll = async (prevContentHeight: number) => {
    if (loading || !conversationId) return;
    isLoadingRef.current = true;
    try {
      if (contextModeRef.current) {
        const firstId = messages[0]?.id;
        if (firstId) {
          const older = await fetchOldMessages(
            conversationId,
            firstId,
            PAGE_SIZE,
          );
          if (older.length > 0) {
            setMessages((prev) => mergeAndSortMessages(prev, older));
            setTimeout(() => {
              const newH = contentHeightRef.current || 0;
              const diff = newH - prevContentHeight;
              if (diff > 0) {
                flatListRef.current?.scrollToOffset({
                  offset: diff,
                  animated: false,
                });
              }
            }, 1000);
          } else {
            contextHasMoreOlderRef.current = false;
          }
        } else {
          contextHasMoreOlderRef.current = false;
        }
      } else if (hasMore && !firstLoad) {
        const more = await fetchMessages(conversationId, page, PAGE_SIZE);
        if (more.length > 0) {
          setMessages((prev) => mergeAndSortMessages(prev, more));
          setPage((prev) => prev + 1);
          setHasMore(more.length === PAGE_SIZE);

          setTimeout(() => {
            const newH = contentHeightRef.current || 0;
            const diff = newH - prevContentHeight;
            if (diff > 0) {
              flatListRef.current?.scrollToOffset({
                offset: diff,
                animated: false,
              });
            }
          }, 1000);
        } else {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error("Failed to load more messages:", err);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  };

  // Load newer messages when near bottom in context mode
  const loadNewerMessages = async () => {
    if (!contextModeRef.current || loading || !contextHasMoreNewerRef.current)
      return;

    setLoading(true);
    try {
      const lastId = messages[messages.length - 1]?.id;
      if (lastId) {
        const newer = await fetchNewMessages(conversationId, lastId, PAGE_SIZE);
        if (newer.length > 0) {
          setMessages((prev) => mergeAndSortMessages(prev, newer));
        } else {
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
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;

    contentHeightRef.current = contentSize.height;

    const isAtTop = contentOffset.y <= 50;

    if (isAtTop && !loading && !isLoadingRef.current) {
      if (contextModeRef.current) {
        if (!contextHasMoreOlderRef.current) return;
      } else {
        if (!hasMore) return;
      }
      const prevHeight = contentSize.height;
      loadMorePreserveScroll(prevHeight);
    }

    const nearBottom =
      contentSize.height - contentOffset.y - layoutMeasurement.height < 50;
    if (nearBottom && contextModeRef.current && !loading) {
      if (!contextHasMoreNewerRef.current) return;
      loadNewerMessages();
    }
  };

  const renderMessageItem = useCallback(
    ({ item: m }: { item: MessageResponse }) => {
      const isOwn = m.sender.userId === currentUserId;

      if (m.type === "notification")
        return renderMessageContent(
          m,
          isOwn,
          highlightedMessageId,
          highlightQuery,
        );

      const idx = messages.indexOf(m);
      let prev: MessageResponse | undefined = undefined;
      for (let i = idx - 1; i >= 0; i--) {
        if (messages[i].type !== "notification") {
          prev = messages[i];
          break;
        }
      }

      let next: MessageResponse | undefined = undefined;
      for (let i = idx + 1; i < messages.length; i++) {
        if (messages[i].type !== "notification") {
          next = messages[i];
          break;
        }
      }

      const isFirstInGroup = !prev || prev.sender.userId !== m.sender.userId;
      const isLastInGroup = !next || next.sender.userId !== m.sender.userId;

      const isTranslating = translatingIds.includes(m.id);

      return (
        <MessageRow
          m={m}
          isOwn={isOwn}
          isFirstInGroup={isFirstInGroup}
          isLastInGroup={isLastInGroup}
          highlightedMessageId={highlightedMessageId}
          highlightQuery={highlightQuery}
          onLongPress={openActionMenu}
        />
      );
    },
    [
      messages,
      currentUserId,
      highlightedMessageId,
      highlightQuery,
      translatingIds,
    ],
  );

  // Auto clear error
  useEffect(() => {
    if (errorMsg) {
      const timeout = setTimeout(() => setErrorMsg(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [errorMsg]);

  const activeTypingUsers = Object.entries(typingUsers)
    .filter(([_, isTyping]) => isTyping)
    .map(([uid]) => conversation?.members.find((m) => m.userId === uid))
    .filter(Boolean);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#000000",
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: "#fff" }}
      >
        <ChatHeader
          conversation={conversation}
          currentUserId={currentUserId}
          usersPresence={usersPresence}
          onBackPress={() => navigation.goBack()}
          onOpenDetails={() =>
            navigation.navigate("ConversationDetails", { conversation })
          }
        />

        <View style={{ flex: 1 }}>
          {loading && !messages.length ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
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
              maintainVisibleContentPosition={{
                minIndexForVisible: 1,
                autoscrollToTopThreshold: -1,
              }}
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
                  <View
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
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
            <TypingIndicator users={activeTypingUsers as any} />
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
          {audioRecorder.isRecording && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingBottom: 6,
              }}
            >
              <MaterialIcons
                name="fiber-manual-record"
                size={12}
                color="#ef4444"
              />
              <Text style={{ marginLeft: 6, color: "#ef4444", fontSize: 12 }}>
                Recording... {Math.floor(audioRecorder.duration / 1000)}s
              </Text>
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
              onPress={handlePickMedia}
              style={{
                width: 36,
                height: 36,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MaterialIcons name="photo-library" size={20} color="#6b7280" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePickFile}
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
              onPress={handleMicPress}
              style={{
                width: 36,
                height: 36,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MaterialIcons
                name={audioRecorder.isRecording ? "stop-circle" : "mic"}
                size={22}
                color={audioRecorder.isRecording ? "#ef4444" : "#6b7280"}
              />
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
              editable={!audioRecorder.isRecording}
              placeholder={
                audioRecorder.isRecording
                  ? "Recording audio..."
                  : "Type a message..."
              }
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

          {/* Action menu overlay (long-press) */}
          {actionMenuVisible && selectedMessageForAction && (
            <>
              <TouchableWithoutFeedback onPress={closeActionMenu}>
                <View style={StyleSheet.absoluteFill} />
              </TouchableWithoutFeedback>
              <View
                style={{
                  position: "absolute",
                  bottom: 66,
                  left: 0,
                  right: 0,
                }}
                pointerEvents="box-none"
              >
                <View
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 8,
                    paddingVertical: 16,
                    paddingHorizontal: 8,
                    elevation: 6,
                    shadowColor: "#000",
                    shadowOpacity: 0.12,
                    shadowRadius: 8,
                    flexDirection: "row",
                  }}
                >
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                    }}
                    onPress={() => {
                      // close first so it disappears immediately
                      const msg = selectedMessageForAction;
                      closeActionMenu();
                      if (msg) handleTranslation(msg);
                    }}
                  >
                    <MaterialIcons name="translate" size={16} color="#111827" />
                    <Text
                      style={{ fontSize: 14, color: "#111827", marginLeft: 4 }}
                    >
                      Translate
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                    }}
                    onPress={() => {
                      const msg = selectedMessageForAction;
                      closeActionMenu();
                      if (msg?.content) {
                        Clipboard.setStringAsync(msg.content);
                      }
                    }}
                  >
                    <MaterialIcons
                      name="content-copy"
                      size={16}
                      color="#111827"
                    />
                    <Text
                      style={{ fontSize: 14, color: "#111827", marginLeft: 4 }}
                    >
                      Copy
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
