import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  Alert,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, UserMinus } from "lucide-react-native";
import { useChatContext } from "../context/ChatContext";
import { getFriends, unfriend } from "../api/friendApi";
import { DEFAULT_AVATAR } from "../constants/common";
import { normalizeImageUrl } from "../utils/image";

export default function FriendListScreen() {
  const navigation = useNavigation<any>();
  const { currentUserId } = useChatContext();
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFriends = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const res = await getFriends(currentUserId);
      setFriends(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [currentUserId]);

  const confirmUnfriend = (id: string, name?: string) => {
    Alert.alert(
      "Unfriend",
      `Remove ${name || "this user"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unfriend",
          style: "destructive",
          onPress: async () => {
            await unfriend(currentUserId!, id);
            setFriends((prev) => prev.filter((f) => f.id !== id));
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.title}>Friends</Text>
      </View>

      {/* LIST */}
      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 16 }}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.left}>
              <Image
                source={
                  normalizeImageUrl(item.imageUrl)
                    ? { uri: normalizeImageUrl(item.imageUrl) }
                    : { uri: normalizeImageUrl(DEFAULT_AVATAR) }
                }
                style={styles.avatar}
              />
              <View>
                <Text style={styles.name}>{item.fullName}</Text>
                {item.email && (
                  <Text style={styles.email}>{item.email}</Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.remove}
              onPress={() => confirmUnfriend(item.id, item.fullName)}
            >
              <UserMinus size={18} color="white" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No friends</Text> : null
        }
        ListFooterComponent={loading ? <ActivityIndicator /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 22,
    backgroundColor: "#f5f6f7",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  backButton: {
    padding: 6,
    marginRight: 12,
  },

  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginRight: 30, // giữ title thật sự ở giữa
  },

  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "white",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },

  name: {
    fontSize: 16,
    fontWeight: "600",
  },

  email: {
    color: "#666",
  },

  remove: {
    backgroundColor: "#e63946",
    padding: 8,
    borderRadius: 10,
  },

  empty: {
    textAlign: "center",
    marginTop: 20,
    color: "#666",
  },
});
