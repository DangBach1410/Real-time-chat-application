import React from "react";
import { View, Text, Image, Button } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useChatContext } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";

export default function ProfileScreen() {
  const { user } = useChatContext();
  const { logout } = useAuth(); // Lấy hàm logout từ AuthContext

  const handleLogout = async () => {
    await AsyncStorage.clear();   // Xóa toàn bộ token và cache  
    logout();                     // Chuyển isLoggedIn về false → auto navigate to Login
  };

  return (
    <View style={{ flex: 1, alignItems: "center", padding: 16 }}>
      <Image
        source={{ uri: user.imageUrl }}
        style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 16 }}
      />

      <Text style={{ fontSize: 20, fontWeight: "bold" }}>{user.fullName}</Text>
      <Text style={{ color: "#666", marginBottom: 16 }}>{user.email}</Text>

      <Button title="Edit Profile" onPress={() => {}} />
      <View style={{ height: 8 }} />
      <Button title="Change Password" onPress={() => {}} />
      <View style={{ height: 16 }} />

      <Button title="Logout" color="red" onPress={handleLogout} />
    </View>
  );
}
