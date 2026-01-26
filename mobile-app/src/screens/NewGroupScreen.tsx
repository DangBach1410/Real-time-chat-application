import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { createConversation } from "../api/chatApi";
import { DEFAULT_AVATAR } from "../constants/common";
import { normalizeImageUrl } from "../utils/image";
import { useChatContext } from "../context/ChatContext";
import { getFriends, type GetFriendResponse } from "../api/friendApi";
import { useEffect } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

interface Friend {
  id: string;
  fullName: string;
  imageUrl?: string;
}

export default function NewGroupScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useChatContext();

  const { currentUserId, onCreated } = route.params;

  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ name?: string; members?: string }>({});
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<GetFriendResponse[]>([]);
  // Load friends
  useEffect(() => {
    const loadFriends = async () => {
      try {
        const res = await getFriends(currentUserId);
        setFriends(res.data || []);
      } catch (err) {
        console.error("Failed to load friends", err);
      }
    };
    loadFriends();
  }, [currentUserId]);

  const normalize = (str: string) =>
    str
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const filteredFriends = useMemo(
    () =>
      friends.filter((f: Friend) =>
        normalize(f.fullName).includes(normalize(search)),
      ),
    [search, friends],
  );

  const toggleUser = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id],
    );
    setErrors((e) => ({ ...e, members: undefined }));
  };

  const handleCreate = async () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = "Group name is required";
    if (selected.length === 0) newErrors.members = "Add at least one member";

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);

      const members = [
        {
          userId: currentUserId,
          fullName: user.fullName,
          imageUrl: user?.imageUrl || DEFAULT_AVATAR,
          role: "admin",
        },
        ...selected.map((id) => {
          const f = friends.find((u: Friend) => u.id === id)!;
          return {
            userId: f.id,
            fullName: f.fullName,
            imageUrl: f.imageUrl || "",
            role: "member",
          };
        }),
      ];

      const conv = await createConversation({
        type: "group",
        name: name.trim(),
        members,
      });

      onCreated(conv);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#000000",
    }}>
      <View style={{ flex: 1, backgroundColor: "#fff", padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12 }}>
          New Group
        </Text>

        {/* Group name */}
        <TextInput
          placeholder="Group name"
          value={name}
          onChangeText={(v) => {
            setName(v);
            setErrors((e) => ({ ...e, name: undefined }));
          }}
          style={{
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 8,
            padding: 10,
            marginBottom: 4,
          }}
        />
        {errors.name && <Text style={{ color: "red" }}>{errors.name}</Text>}

        {/* Search */}
        <TextInput
          placeholder="Search friends..."
          value={search}
          onChangeText={setSearch}
          style={{
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 8,
            padding: 10,
            marginVertical: 10,
          }}
        />

        {/* Friend list */}
        <FlatList
          data={filteredFriends}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          renderItem={({ item }) => {
            const checked = selected.includes(item.id);
            return (
              <TouchableOpacity
                onPress={() => toggleUser(item.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 8,
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    borderWidth: 1.5,
                    borderColor: checked ? "#3b82f6" : "#9ca3af",
                    backgroundColor: checked ? "#3b82f6" : "#fff",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {checked && (
                    <MaterialIcons name="check" size={16} color="#fff" />
                  )}
                </View>
                <Image
                  source={{
                    uri:
                      normalizeImageUrl(item.imageUrl) ||
                      normalizeImageUrl(DEFAULT_AVATAR),
                  }}
                  style={{ width: 32, height: 32, borderRadius: 16 }}
                />
                <Text>{item.fullName}</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: "#6b7280" }}>
              No friends found
            </Text>
          }
        />

        {errors.members && (
          <Text style={{ color: "red" }}>{errors.members}</Text>
        )}

        {/* Buttons */}
        <View
          style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              backgroundColor: "#e65b5bff",
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={loading}
            onPress={handleCreate}
            style={{
              backgroundColor: "#1d7638ff",
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>
              {loading ? "Creating..." : "Create"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
