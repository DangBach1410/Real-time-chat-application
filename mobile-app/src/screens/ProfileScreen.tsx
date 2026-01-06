import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useChatContext } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { DEFAULT_AVATAR } from "../constants/common";
import { Camera, LogOut, Users, UserPlus } from "lucide-react-native";
import { updateUserImage } from "../api/authApi";
import { normalizeImageUrl } from "../utils/image";

export default function ProfileScreen() {
  const { user, currentUserId, setUser } = useChatContext();
  const { logout } = useAuth();
  const navigation = useNavigation<any>();

  const [uploading, setUploading] = useState(false);

  const handleLogout = async () => {
    await AsyncStorage.clear();
    logout();
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission denied", "Allow access to your images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.length) return;

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];

      try {
        setUploading(true);

        const formData = new FormData();
        formData.append("file", {
          uri: asset.uri,
          name: asset.fileName || `avatar_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
        } as any);

        const res = await updateUserImage(currentUserId!, formData);

        if (res?.data?.status === 200 && res.data.imageUrl) {
          setUser({
            ...user,
            imageUrl: res.data.imageUrl,
          });
        }
      } catch (err) {
        console.error("Upload image failed:", err);
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <View style={styles.listContainer}>
      {/* ================= PROFILE HEADER ================= */}
      <View style={styles.profileContainer}>
        <View style={styles.avatarColumn}>
          <Image
            source={
              normalizeImageUrl(user.imageUrl)
                ? { uri: normalizeImageUrl(user.imageUrl) }
                : { uri: normalizeImageUrl(DEFAULT_AVATAR) }
            }
            style={styles.avatar}
          />

          <TouchableOpacity onPress={pickImage} style={styles.cameraButton}>
            <Camera size={18} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoColumn}>
          <Text style={styles.profileName}>{user.fullName}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
          {uploading && <Text style={styles.uploadingText}>Uploading...</Text>}
        </View>
      </View>

      {/* ================= ACTION GROUP ================= */}
      <View style={styles.actionGroup}>
        {/* NEW — FRIEND SCREENS */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate("FriendList")}
        >
          <Users size={18} color="#000" style={{ marginRight: 6 }} />
          <Text style={styles.actionText}>Friends</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate("FriendRequests")}
        >
          <UserPlus size={18} color="#000" style={{ marginRight: 6 }} />
          <Text style={styles.actionText}>Friend Requests</Text>
        </TouchableOpacity>

        {!user.provider && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("EditProfile")}
            >
              <Text style={styles.actionText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("ChangePassword")}
            >
              <Text style={styles.actionText}>Change Password</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.logoutButton]}
          onPress={handleLogout}
        >
          <LogOut size={18} color="red" style={{ marginRight: 6 }} />
          <Text style={[styles.actionText, { color: "red" }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 20,
    backgroundColor: "#f5f6f7",
    flex: 1,
  },

  profileContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },

  avatarColumn: {
    position: "relative",
    marginRight: 16,
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#ddd",
    borderWidth: 1,
    borderColor: "#ddd",
  },

  cameraButton: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#000",
    padding: 8,
    borderRadius: 100,
  },

  infoColumn: {
    flex: 1,
    justifyContent: "center",
  },

  profileName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },

  profileEmail: {
    fontSize: 15,
    color: "#555",
  },

  uploadingText: {
    marginTop: 6,
    color: "#666",
  },

  actionGroup: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },

  actionButton: {
    width: "100%",
    backgroundColor: "white",
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  actionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },

  logoutButton: {
    borderColor: "red",
  },
});
