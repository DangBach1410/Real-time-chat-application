import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import {
  getFriendRequests,
  acceptFriendRequest,
  deleteFriendRequest,
  type GetFriendRequestResponse,
} from "../api/friendApi";
import { DEFAULT_AVATAR } from "../constants/common";
import { Check, X, ArrowLeft } from "lucide-react-native";
import { normalizeImageUrl } from "../utils/image";
import { useChatContext } from "../context/ChatContext";
import { useNavigation } from "@react-navigation/native";

export default function FriendRequestsScreen() {
  const { currentUserId } = useChatContext();
  const navigation = useNavigation<any>();

  const [requests, setRequests] = useState<GetFriendRequestResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const res = await getFriendRequests(currentUserId);
      setRequests(res.data || []);
    } catch (err) {
      console.error("Error fetching friend requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (senderId: string) => {
    try {
      await acceptFriendRequest(currentUserId!, senderId);
      setRequests((prev) => prev.filter((r) => r.senderId !== senderId));
    } catch (err) {
      console.error("Error accepting request:", err);
    }
  };

  const handleReject = async (senderId: string) => {
    try {
      await deleteFriendRequest(currentUserId!, senderId);
      setRequests((prev) => prev.filter((r) => r.senderId !== senderId));
    } catch (err) {
      console.error("Error rejecting request:", err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUserId]);

  const renderItem = ({ item }: { item: GetFriendRequestResponse }) => {
    const avatar =
      normalizeImageUrl(item.senderImageUrl) ??
      normalizeImageUrl(DEFAULT_AVATAR);

    return (
      <View style={styles.card}>
        <View style={styles.left}>
          <Image source={{ uri: avatar }} style={styles.avatar} />
          <View>
            <Text style={styles.name}>{item.senderFullName}</Text>
            <Text style={styles.email}>
              {item.senderEmail || "No email"}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={() => handleAccept(item.senderId)}
          >
            <Check size={18} color="white" />
            <Text style={styles.actionText}>Accept</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => handleReject(item.senderId)}
          >
            <X size={18} color="white" />
            <Text style={styles.actionText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Friend Requests</Text>

        {/* spacer để title luôn center */}
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.senderId}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No pending friend requests.
            </Text>
          }
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    padding: 16,
  },

  /* ===== HEADER ===== */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  backButton: {
    padding: 4,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  /* ===== LIST ===== */
  card: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  email: {
    fontSize: 13,
    color: "#6b7280",
  },

  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },

  acceptBtn: {
    backgroundColor: "#2563eb",
  },

  rejectBtn: {
    backgroundColor: "#ef4444",
  },

  actionText: {
    color: "white",
    fontWeight: "600",
  },

  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 20,
  },
});
