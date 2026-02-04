import React, { useMemo } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ConversationResponse } from "../api/chatApi";
import { DEFAULT_AVATAR } from "../constants/common";
import { normalizeImageUrl } from "../utils/image";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainStackParamList } from "../navigation/types";
import { startOrJoinCall, type CallRequest } from "../api/callApi";
import { useChatContext } from "../context/ChatContext";

type NavProp = NativeStackNavigationProp<MainStackParamList, "Chat">;

interface ChatHeaderProps {
  conversation: ConversationResponse;
  currentUserId: string;
  usersPresence: Record<string, number>;
  onBackPress: () => void;
  onOpenDetails?: () => void;
}

export default function ChatHeader({
  conversation,
  currentUserId,
  usersPresence,
  onBackPress,
  onOpenDetails,
}: ChatHeaderProps) {
  const navigation = useNavigation<NavProp>();
  const { user } = useChatContext();

  const isPrivate = conversation.type === "private";

  const otherUser = isPrivate
    ? conversation.members.find((m) => m.userId !== currentUserId)
    : null;

  const displayName = isPrivate
    ? otherUser?.fullName
    : conversation.name || "Unnamed group";

  const displayImage = isPrivate ? otherUser?.imageUrl : conversation.imageUrl;

  const lastSeenPrivate =
    isPrivate && otherUser ? usersPresence[otherUser.userId] : null;

  const diffMinutes =
    lastSeenPrivate != null
      ? Math.floor((Date.now() - lastSeenPrivate) / 60000)
      : null;

  const isOnline = useMemo(() => {
    if (isPrivate && otherUser) {
      if (!lastSeenPrivate) return false;
      return (Date.now() - lastSeenPrivate) / 60000 <= 5;
    }

    // group
    return conversation.members.some((m) => {
      if (m.userId === currentUserId) return false;
      const seen = usersPresence[m.userId];
      if (!seen) return false;
      return (Date.now() - seen) / 60000 <= 5;
    });
  }, [conversation, usersPresence, lastSeenPrivate]);

  const renderAvatar = () => {
    // PRIVATE CHAT
    if (isPrivate) {
      return (
        <Image
          source={{
            uri: normalizeImageUrl(displayImage || DEFAULT_AVATAR),
          }}
          style={styles.avatar}
        />
      );
    }

    // GROUP has image
    if (conversation.imageUrl) {
      return (
        <Image
          source={{
            uri: normalizeImageUrl(conversation.imageUrl),
          }}
          style={styles.avatar}
        />
      );
    }

    // GROUP no image -> show last 2 members
    const members = conversation.members.slice(-2);

    return (
      <View style={styles.groupAvatar}>
        {members.map((m, idx) => (
          <Image
            key={m.userId}
            source={{
              uri: normalizeImageUrl(m.imageUrl || DEFAULT_AVATAR),
            }}
            style={[
              styles.groupAvatarItem,
              idx === 0 ? styles.avatarTopRight : styles.avatarBottomLeft,
            ]}
          />
        ))}
      </View>
    );
  };

  const statusText = isOnline
    ? "Online"
    : isPrivate
    ? diffMinutes !== null
      ? `Active ${diffMinutes} minutes ago`
      : "Offline"
    : "Offline";

  // --- Navigation helpers ---
  const channel = conversation.id || null;
  const currentMember =
    conversation.members.find((m) => m.userId === currentUserId) ?? null;
  const initiatorName =
    currentMember?.fullName || "Unknown";

  const handleNavigateToCall = async (callType: "audio" | "video") => {
    if (!channel) {
      console.warn(
        "Call channel not available on conversation, cannot start call."
      );
      return;
    }
    const payload: CallRequest = {
      type: callType,
      conversationId: conversation.id,
      callerId: currentUserId,
      callerName: user.fullName,
      callerImage: normalizeImageUrl(user.imageUrl || DEFAULT_AVATAR) || DEFAULT_AVATAR,
    };

    const response = await startOrJoinCall(payload);
    navigation.navigate("CallScreen", {
      channel,
      agoraUid: response.agoraUid,
      type: callType,
      userName: initiatorName,
    });
  };

  return (
    <View style={styles.container}>
      {/* Left */}
      <View style={styles.left}>
        <TouchableOpacity onPress={onBackPress} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.avatarWrapper}>
          {renderAvatar()}
          {isOnline && <View style={styles.onlineDot} />}
        </View>

        <View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.status}>{statusText}</Text>
        </View>
      </View>

      {/* Right */}
      <View style={styles.right}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => handleNavigateToCall("audio")}
        >
          <MaterialIcons name="call" size={20} color="#374151" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => handleNavigateToCall("video")}
        >
          <MaterialIcons name="videocam" size={22} color="#374151" />
        </TouchableOpacity>
        {onOpenDetails && (
          <TouchableOpacity style={styles.iconBtn} onPress={onOpenDetails}>
            <MaterialIcons name="more-vert" size={22} color="#374151" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  right: {
    flexDirection: "row",
    gap: 6,
  },
  backBtn: {
    padding: 4,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10b981",
    borderWidth: 2,
    borderColor: "#fff",
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  status: {
    fontSize: 11,
    color: "#6b7280",
  },
  iconBtn: {
    padding: 6,
  },
  groupAvatar: {
    width: 36,
    height: 36,
    position: "relative",
  },

  groupAvatarItem: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: "absolute",
  },

  avatarTopRight: {
    top: 3,
    right: 2,
    zIndex: 1,
  },

  avatarBottomLeft: {
    bottom: 3,
    left: 2,
    zIndex: 2,
  },
});
