import React, { useEffect, useState, useRef } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

import { fetchUserById } from "../api/userApi";
import type { UserResponse } from "../api/userApi";
import type { CallRequest } from "../api/callApi";
// import Navbar from "../components/Navbar";
// import IncomingCallModal from "../components/IncomingCallModal";

import { ChatContext } from "../context/ChatContext";

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
  const [keyword, setKeyword] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [incomingCall, setIncomingCall] = useState<CallRequest | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  const navigation = useNavigation<any>();
  const stompClientRef = useRef<Client | null>(null);

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

  // --- Connect WebSocket & subscribe call ---
  useEffect(() => {
    if (!currentUserId) return;

    const socket = new SockJS("http://localhost:8083/ws");
    const client = new Client({
      webSocketFactory: () => socket as any,
      reconnectDelay: 5000,
      debug: (msg) => console.log("📡 WS:", msg),
    });

    client.onConnect = () => {
      console.log("✅ STOMP connected for user:", currentUserId);
      client.subscribe(`/topic/call/${currentUserId}`, (message) => {
        try {
          const data = JSON.parse(message.body);
          setIncomingCall(data);
        } catch (err) {
          console.error("❌ Failed to parse call message:", err);
        }
      });
    };

    client.onStompError = (frame) => {
      console.error("STOMP error:", frame.headers["message"]);
    };

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
      stompClientRef.current = null;
    };
  }, [currentUserId]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) return null;

  return (
    <ChatContext.Provider value={{ user, keyword, currentUserId }}>
      <View style={{ flex: 1 }}>
        {/* <Navbar onSearch={(kw) => setKeyword(kw)} fullName={user.fullName} imageUrl={user.imageUrl} /> */}

        {children}
{/* 
        <IncomingCallModal
          open={!!incomingCall}
          callerName={incomingCall?.callerName || ""}
          callerImage={incomingCall?.callerImage}
          callType={incomingCall?.type || "audio"}
          conversationId={incomingCall?.conversationId || ""}
          conversationName={incomingCall?.conversationName}
          onAccept={() => setIncomingCall(null)}
          onDecline={() => setIncomingCall(null)}
          onTimeout={() => setIncomingCall(null)}
        /> */}
      </View>
    </ChatContext.Provider>
  );
}
