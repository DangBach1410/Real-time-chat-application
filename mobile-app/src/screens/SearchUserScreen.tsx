import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useChatContext } from "../context/ChatContext";
import { searchUsers } from "../api/searchApi";
import {
  sendFriendRequest,
  acceptFriendRequest,
  deleteFriendRequest,
} from "../api/friendApi";
import { getPrivateConversation } from "../api/chatApi";
import { DEFAULT_AVATAR } from "../constants/common";

import {
  UserPlusIcon,
  XCircleIcon,
  CheckCircleIcon,
  ChatBubbleLeftIcon,
} from "react-native-heroicons/solid";

export default function SearchUserScreen() {
  const { currentUserId } = useChatContext();
  const navigation = useNavigation<any>();

  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async (reset = false) => {
    if (loading || (!hasMore && !reset) || !keyword.trim()) return;

    setLoading(true);
    const pageToFetch = reset ? 0 : page;

    try {
      const res = await searchUsers(currentUserId, keyword, pageToFetch, 10);
      const data = res.data || [];

      setResults((prev) => (reset ? data : [...prev, ...data]));
      setPage(pageToFetch + 1);
      setHasMore(data.length > 0);
    } catch (err) {
      console.error("Search error:", err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setResults([]);
      setPage(0);
      setHasMore(true);
      fetchUsers(true);
    }, 400);

    return () => clearTimeout(timer);
  }, [keyword]);

  const goToChat = async (friendId: string) => {
    const conversation = await getPrivateConversation(currentUserId, friendId);
    navigation.navigate("Chat", { conversationId: conversation.id });
  };

  const updateStatus = (userId: string, status: string) => {
    setResults((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status } : u))
    );
  };

  const renderAction = (user: any) => {
    switch (user.status) {
      case "FRIEND":
        return (
          <IconButton
            Icon={ChatBubbleLeftIcon}
            color="#22c55e"
            onPress={() => goToChat(user.id)}
          />
        );

      case "PENDING":
        return (
          <IconButton
            Icon={XCircleIcon}
            color="#9ca3af"
            onPress={async () => {
              await deleteFriendRequest(user.id, currentUserId);
              updateStatus(user.id, "NONE");
            }}
          />
        );

      case "REQUESTED":
        return (
          <IconButton
            Icon={CheckCircleIcon}
            color="#3b82f6"
            onPress={async () => {
              await acceptFriendRequest(currentUserId, user.id);
              updateStatus(user.id, "FRIEND");
            }}
          />
        );

      default:
        return (
          <IconButton
            Icon={UserPlusIcon}
            color="#3b82f6"
            onPress={async () => {
              await sendFriendRequest(currentUserId, user.id);
              updateStatus(user.id, "PENDING");
            }}
          />
        );
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.userInfo}>
        <Image
          source={{ uri: item.imageUrl || DEFAULT_AVATAR }}
          style={styles.avatar}
        />
        <View>
          <Text style={styles.name}>{item.fullName}</Text>
          <Text style={styles.email}>{item.email || "No email"}</Text>
        </View>
      </View>
      {renderAction(item)}
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search users..."
        value={keyword}
        onChangeText={setKeyword}
        style={styles.searchInput}
      />

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onEndReached={() => fetchUsers()}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No users found</Text> : null
        }
        ListFooterComponent={
          loading ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null
        }
      />
    </View>
  );
}

function IconButton({
  Icon,
  color,
  onPress,
}: {
  Icon: any;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.iconBtn, { backgroundColor: color }]}
    >
      <Icon size={22} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f3f4f6",
  },

  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  name: {
    fontSize: 16,
    fontWeight: "600",
  },

  email: {
    fontSize: 13,
    color: "#6b7280",
  },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },

  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#6b7280",
  },
});
