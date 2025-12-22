import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { ConversationResponse } from "../api/chatApi";

interface ChatHeaderProps {
  conversation: ConversationResponse | null;
  onBackPress: () => void;
  onCallPress?: () => void;
  onVideoCallPress?: () => void;
}

export default function ChatHeader({
  conversation,
  onBackPress,
  onCallPress,
  onVideoCallPress,
}: ChatHeaderProps) {
  if (!conversation) return null;

  const displayName =
    conversation.type === "group"
      ? conversation.name || "Unnamed group"
      : conversation.members.find((m) => m.userId !== conversation.members[0]?.userId)
          ?.fullName || "Private chat";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
        backgroundColor: "#fff",
      }}
    >
      <TouchableOpacity onPress={onBackPress} style={{ marginRight: 12 }}>
        <MaterialIcons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#000" }}>
          {displayName}
        </Text>
        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
          {conversation.type === "group"
            ? `${conversation.members.length} members`
            : "Online"}
        </Text>
      </View>
      {conversation.type === "private" && (
        <>
          <TouchableOpacity style={{ marginLeft: 12 }} onPress={onCallPress}>
            <MaterialIcons name="call" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ marginLeft: 12 }}
            onPress={onVideoCallPress}
          >
            <MaterialIcons name="videocam" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
