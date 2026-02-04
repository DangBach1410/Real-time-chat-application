// HomeTab.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { useChatContext } from "../context/ChatContext";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  fetchConversations,
  searchConversations,
  type ConversationResponse,
} from "../api/chatApi";
import { updatePresence, getPresence } from "../api/presenceApi";
import { normalizeImageUrl } from "../utils/image";
import * as StompJs from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { DEFAULT_AVATAR } from "../constants/common";
import { API_URL } from '../constants/common';

const PAGE_SIZE = 20;

export default function HomeTab() {
  const { user, currentUserId } = useChatContext();
  const navigation = useNavigation<any>();
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ConversationResponse[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [convPage, setConvPage] = useState(0);
  const [convHasMore, setConvHasMore] = useState(true);
  const [searchPage, setSearchPage] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(true);
  const { usersPresence, setUsersPresence } = useChatContext();
  const stompClientRef = useRef<StompJs.Client | null>(null);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      try {
        const data = await fetchConversations(currentUserId, 0, PAGE_SIZE);
        setConversations(data);
        setConvPage(1);
        setConvHasMore(data.length === PAGE_SIZE);

        // Fetch presence for initial conversations
        const userIds = data
          .map((c) =>
            c.type === "private"
              ? c.members.find((m) => m.userId !== currentUserId)?.userId
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
        console.error("Failed to load conversations:", err);
      } finally {
        setLoading(false);
      }
    };
    loadConversations();
  }, [currentUserId]);

  // Load more conversations on scroll
  const handleLoadMoreConversations = async () => {
    if (!convHasMore || loading) return;
    setLoading(true);
    try {
      const nextPage = convPage;
      const data = await fetchConversations(currentUserId, nextPage, PAGE_SIZE);
      if (data.length > 0) {
        setConversations((prev) => [...prev, ...data]);
        setConvPage(nextPage + 1);
        setConvHasMore(data.length === PAGE_SIZE);

        // Fetch presence for newly loaded conversations
        const userIds = data
          .map((c) =>
            c.type === "private"
              ? c.members.find((m) => m.userId !== currentUserId)?.userId
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
      } else {
        setConvHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle search with debounce
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
    if (searchLoading) return;
    setSearchLoading(true);
    try {
      const res = await searchConversations(currentUserId, searchQuery, page, PAGE_SIZE);
      if (page === 0) setSearchResults(res);
      else setSearchResults((prev) => [...prev, ...res]);
      setSearchHasMore(res.length === PAGE_SIZE);
      setSearchPage(page + 1);

      // Fetch presence for search results
      const userIds = res
        .map((c) =>
          c.type === "private"
            ? c.members.find((m) => m.userId !== currentUserId)?.userId
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
      console.error("Search error:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  // WebSocket for presence updates
  useEffect(() => {
    if (!currentUserId) return;

    const socket = new SockJS(`${API_URL}:8085/ws-presence`);
    const client = new StompJs.Client({
      webSocketFactory: () => socket as any,
      debug: (str) => console.log("Presence WS:", str),
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      console.log("Presence STOMP connected");
      client.subscribe("/topic/presence", (message) => {
        try {
          const data = JSON.parse(message.body);
          setUsersPresence((prev) => ({
            ...prev,
            [data.userId]: data.lastSeen,
          }));
        } catch (err) {
          console.error("Failed to parse presence data:", err);
        }
      });
    };

    client.activate();
    stompClientRef.current = client;

    // Send presence heartbeat
    const sendHeartbeat = async () => {
      try {
        await updatePresence(currentUserId);
      } catch (err) {
        console.error("Heartbeat error:", err);
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      client.deactivate();
    };
  }, [currentUserId]);

  // WebSocket for global conversation updates
  useEffect(() => {
    if (!currentUserId) return;

    const socket = new SockJS(`${API_URL}:8083/ws`);
    const client = new StompJs.Client({
      webSocketFactory: () => socket as any,
      debug: (str) => console.log("Global STOMP:", str),
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      console.log("Connected to /topic/conversations/user/" + currentUserId);
      client.subscribe(`/topic/conversations/user/${currentUserId}`, (message) => {
        try {
          const updated = JSON.parse(message.body) as ConversationResponse;
          upsertConversation(updated);
        } catch (err) {
          console.error("Failed to parse conversation update:", err);
        }
      });
    };

    client.activate();

    return () => {
      client.deactivate();
    };
  }, [currentUserId]);

  const upsertConversation = (updated: ConversationResponse) => {
    setConversations((prev) => {
      const lastMsg = updated.lastMessage;
      if (
        lastMsg &&
        lastMsg.sender.userId === currentUserId &&
        lastMsg.type === "notification" &&
        lastMsg.content === "left the conversation"
      ) {
        return prev.filter((c) => c.id !== updated.id);
      }

      const exists = prev.find((c) => c.id === updated.id);
      if (exists) {
        return [updated, ...prev.filter((c) => c.id !== updated.id)];
      } else {
        return [updated, ...prev];
      }
    });
  };

  // helper for last message preview
  const getLastMessagePreview = (c: ConversationResponse) => {
    if (!c.lastMessage) return "No messages yet";
    const { type, sender, content } = c.lastMessage;
    const isOwn = sender.userId === currentUserId;
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

  const isGroupOnline = (group: ConversationResponse): boolean => {
    return group.members.some((member) => {
      if (member.userId === currentUserId) return false;
      const lastSeen = usersPresence[member.userId];
      if (!lastSeen) return false;
      const diffMinutes = Math.floor((Date.now() - lastSeen) / 60000);
      return diffMinutes <= 5;
    });
  };

  const renderConversationItem = ({ item: c }: { item: ConversationResponse }) => {
    const other = c.type === "private" ? c.members.find((m) => m.userId !== currentUserId) : null;
    const displayName = c.type === "group" ? c.name || "Unnamed group" : other?.fullName || "Private chat";
    const displayImage = normalizeImageUrl(
      c.type === "group" ? c.imageUrl || DEFAULT_AVATAR : other?.imageUrl || DEFAULT_AVATAR
    ) || DEFAULT_AVATAR;

    const presenceId = c.type === "group" ? "" : other?.userId || "";
    const lastSeen = presenceId ? usersPresence[presenceId] : null;
    const diffMinutes = lastSeen ? Math.floor((Date.now() - lastSeen) / 60000) : null;
    const isOnline = c.type === "group" ? isGroupOnline(c) : diffMinutes !== null && diffMinutes <= 5;
    const isSelected = selectedConversation === c.id;

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedConversation(c.id);
          // Reset search when navigating
          setSearchResults([]);
          setSearchQuery("");
          navigation.navigate("ConversationChat", {
            conversation: c,
            usersPresence,
          });
        }}
        style={{
          flexDirection: "row",
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          alignItems: "center",
          backgroundColor: isSelected ? "#d1d5db" : "#fff",
        }}
      >
        {/* Avatar - single for private, composite for group */}
        <View style={{ position: "relative" }}>
          {c.type === "group" && !c.imageUrl ? (
            // Composite avatar for groups (last 2 members)
            <View style={{ position: "relative", width: 40, height: 40 }}>
              {c.members.slice(-2).map((m, idx) => (
                <Image
                  key={m.userId}
                  source={{ uri: normalizeImageUrl(m.imageUrl) || DEFAULT_AVATAR }}
                  style={{
                    position: "absolute",
                    width: idx === 0 ? 28 : 28,
                    height: idx === 0 ? 28 : 28,
                    borderRadius: idx === 0 ? 14 : 14,
                    top: idx === 0 ? 0 : 12,
                    left: idx === 0 ? 12 : 0,
                    zIndex: idx === 0 ? 0 : 10,
                  }}
                />
              ))}
            </View>
          ) : (
            // Single avatar for private chats or group with image
            <Image
              source={{ uri: displayImage }}
              style={{ width: 40, height: 40, borderRadius: 20 }}
            />
          )}

          {/* Online indicator */}
          {isOnline && (
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: "#10b981",
                borderWidth: 2,
                borderColor: "#fff",
              }}
            />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "600", marginBottom: 4 }}>{displayName}</Text>
          <Text
            style={{ fontSize: 12, color: "#6b7280" }}
            numberOfLines={1}
          >
            {getLastMessagePreview(c)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Sticky Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", backgroundColor: "#f9fafb" }}>
        {/* New Group Button */}
        <TouchableOpacity
          style={{
            width: "100%",
            paddingVertical: 10,
            paddingHorizontal: 16,
            backgroundColor: "#3b82f6",
            borderRadius: 6,
            marginBottom: 12,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
          }}
          onPress={() =>
            navigation.navigate("NewGroup", {
              currentUserId,
              onCreated: (conv: ConversationResponse) => {
                upsertConversation(conv);
                navigation.navigate("Chat");
                navigation.navigate("ConversationChat", { conversation: conv, usersPresence });
              },
            })
          }
        >
          <MaterialIcons name="group-add" size={20} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>New Group</Text>
        </TouchableOpacity>

        {/* Search Input */}
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            fontSize: 14,
          }}
          placeholder="Search conversations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Conversation List */}
      {loading && !conversations.length ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (searchResults.length === 0 && conversations.length === 0) ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#6b7280" }}>No conversations</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults.length > 0 ? searchResults : conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          onEndReached={() => {
            if (searchResults.length > 0) {
              if (searchHasMore && !searchLoading) {
                loadSearchResults(searchPage);
              }
            } else {
              if (convHasMore && !loading) {
                handleLoadMoreConversations();
              }
            }
          }}
          onEndReachedThreshold={0.3}
          scrollEventThrottle={400}
          ListFooterComponent={
            (loading || searchLoading) ? <ActivityIndicator size="small" color="#3b82f6" style={{ marginVertical: 12 }} /> : null
          }
        />
      )}
    </View>
  );
}
