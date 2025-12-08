import React, { useState } from "react";
import { View, TextInput, FlatList, Text, TouchableOpacity } from "react-native";
import { useChatContext } from "../context/ChatContext";

export default function SearchUserScreen() {
  const { keyword, currentUserId } = useChatContext();
  const [searchTerm, setSearchTerm] = useState("");

  // Giả lập danh sách user
  const users = [
    { id: "1", name: "Alice" },
    { id: "2", name: "Bob" },
    { id: "3", name: "Charlie" },
  ];

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) && u.id !== currentUserId
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput
        placeholder="Search users..."
        value={searchTerm}
        onChangeText={setSearchTerm}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginBottom: 16,
        }}
      />

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={{ paddingVertical: 12 }}>
            <Text>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text>No users found</Text>}
      />
    </View>
  );
}
