// screens/AddMemberScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { DEFAULT_AVATAR } from "../constants/common";
import { getFriends, type GetFriendResponse } from "../api/friendApi";
import { addMembersToConversation, type MemberRequest } from "../api/chatApi";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useChatContext } from "../context/ChatContext";
import { normalizeImageUrl } from "../utils/image";

type RouteParams = {
  AddMember: {
    conversationId: string;
    existingMemberIds: string[];
  };
};

export default function AddMemberScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, "AddMember">>();
  const { conversationId, existingMemberIds } = route.params;

  const [friends, setFriends] = useState<GetFriendResponse[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const { currentUserId } = useChatContext();

  useEffect(() => {
    getFriends(currentUserId)
      .then((res) => {
        const list = (res as any).data ?? res;

        const filteredFriends = list.filter(
          (f: GetFriendResponse) => !existingMemberIds.includes(f.id)
        );

        setFriends(filteredFriends);
      })
      .catch((err) => {
        console.error("Failed to fetch friends", err);
        Alert.alert("Error", "Failed to fetch friends");
      });
  }, []);

  function normalize(str = "") {
    return str
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  const filtered = friends.filter((f) =>
    normalize(f.fullName).includes(normalize(search))
  );

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );

  const handleAdd = async () => {
    if (selected.length === 0) {
      Alert.alert("No selection", "Select at least one friend to add.");
      return;
    }

    setLoading(true);
    try {
      const members: MemberRequest[] = selected.map((id) => {
        const f = friends.find((x) => x.id === id)!;
        return {
          userId: f.id,
          fullName: f.fullName,
          imageUrl: f.imageUrl || "",
          role: "member",
        };
      });

      await addMembersToConversation(conversationId, members);
      navigation.goBack();
    } catch (err) {
      console.error("Failed to add members", err);
      Alert.alert("Error", "Failed to add members");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Members</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchRow}>
        <TextInput
          placeholder="Search friends..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        style={{ flex: 1 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => toggle(item.id)} style={styles.row}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image
                source={{ uri: normalizeImageUrl(item.imageUrl || DEFAULT_AVATAR) }}
                style={styles.avatar}
              />
              <Text style={styles.name}>{item.fullName}</Text>
            </View>
            <View>
              {selected.includes(item.id) ? (
                <MaterialIcons name="check-box" size={22} />
              ) : (
                <MaterialIcons name="check-box-outline-blank" size={22} />
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ padding: 16 }}>
            <Text style={{ color: "#6b7280", textAlign: "center" }}>
              No friends found
            </Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.addBtn, { opacity: loading ? 0.6 : 1 }]}
          onPress={handleAdd}
          disabled={loading}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>
            {loading ? "Adding..." : "Add"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerRow: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: { fontSize: 16, fontWeight: "600" },
  searchRow: { padding: 12 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 8,
    borderRadius: 8,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  name: { fontSize: 14 },
  footer: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  addBtn: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
    backgroundColor: "#2563eb",
  },
});
