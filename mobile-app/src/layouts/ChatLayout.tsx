import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

import { fetchUserById } from "../api/userApi";
import type { UserResponse } from "../api/userApi";
import type { CallRequest } from "../api/callApi";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { startOrJoinCall } from "../api/callApi"; // Import trực tiếp hàm API
import IncomingCallModal from "../components/IncomingCallModal";

import { ChatContext } from "../context/ChatContext";
import { DEFAULT_AVATAR } from "../constants/common";
import { normalizeImageUrl } from "../utils/image";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp * 1000;
    return Date.now() >= exp;
  } catch (e) {
    return true;
  }
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [usersPresence, setUsersPresence] = useState<Record<string, number>>({});
  const [incomingCall, setIncomingCall] = useState<any | null>(null);

  const navigation = useNavigation<any>();

  // --- Load user ---
  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem("refreshToken");
      const userId = await AsyncStorage.getItem("userId");

      if (!token || !userId || isTokenExpired(token)) {
        await AsyncStorage.clear();
        navigation.navigate("Login");
        return;
      }

      setCurrentUserId(userId);

      try {
        const data = await fetchUserById(userId);
        setUser(data);
      } catch (err) {
        console.error("❌ Failed to fetch user:", err);
        await AsyncStorage.clear();
        navigation.navigate("Login");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [navigation]);

  // Gọi hook và truyền state setter vào
  usePushNotifications(currentUserId, user, startOrJoinCall, (data) => setIncomingCall(data));

  const handleAccept = async () => {
    if (!incomingCall || !user) {
      console.warn("Cannot accept call: User or Call data is missing");
      return;
    }
    
    const payload = {
      type: incomingCall.type,
      conversationId: incomingCall.conversationId,
      callerId: currentUserId,
      callerName: user.fullName,
      callerImage: user.imageUrl || normalizeImageUrl(DEFAULT_AVATAR) || DEFAULT_AVATAR,
    };

    const res = await startOrJoinCall(payload);
    setIncomingCall(null);
    navigation.navigate("CallScreen", {
       channel: incomingCall.conversationId,
       agoraUid: res.agoraUid,
       type: incomingCall.type,
       userName: incomingCall.callerName
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) return null;

  return (
    <ChatContext.Provider value={{ user, currentUserId, usersPresence, setUsersPresence, setUser }}>
      <View style={{ flex: 1 }}>
        {children}
      </View>
      <IncomingCallModal
        open={!!incomingCall}
        callerName={incomingCall?.callerName || "Unknown"}
        callerImage={incomingCall?.callerImage}
        callType={incomingCall?.type || "audio"}
        conversationName={incomingCall?.conversationName}
        onAccept={handleAccept}
        onDecline={() => setIncomingCall(null)}
      />
    </ChatContext.Provider>
  );
}
