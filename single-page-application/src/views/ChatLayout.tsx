import { useEffect, useState, useRef } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import IncomingCallModal from "../components/IncomingCallModal";
import { fetchUserById } from "../helpers/userApi";
import type { UserResponse } from "../helpers/userApi";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import type { CallRequest } from "../helpers/callApi";
import { API_URL } from "../constants/common";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp * 1000;
    return Date.now() >= exp;
  } catch (e) {
    return true;
  }
}

export default function ChatLayout() {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [keyword, setKeyword] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [incomingCall, setIncomingCall] = useState<CallRequest | null>(null);
  const navigate = useNavigate();

  const stompClientRef = useRef<Client | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("refreshToken");
    const userId = localStorage.getItem("userId");

    // --- Kiểm tra token ---
    if (!token || isTokenExpired(token) || !userId) {
      localStorage.clear();
      navigate("/login");
      return;
    }

    // --- Fetch user info ---
    const fetchUser = async () => {
      try {
        const data = await fetchUserById(userId);
        setUser(data);
      } catch (err) {
        console.error("❌ Failed to fetch user:", err);
        localStorage.clear();
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  // --- Kết nối WebSocket & Sub call event ---
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    const socket = new SockJS(`${API_URL}:8762/ws`);
    // const socket = new SockJS("/ws");
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      debug: (msg) => console.log("📡 WS:", msg),
    });

    client.onConnect = () => {
      console.log("✅ STOMP connected for user:", userId);

      // Sub tới sự kiện cuộc gọi
      client.subscribe(`/topic/call/${userId}`, (message) => {
        try {
          const data = JSON.parse(message.body);
          console.log("📞 Incoming call:", data);
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
      console.log("🧹 STOMP disconnected");
    };
  }, []); // chỉ chạy 1 lần khi layout mount

  // --- Render ---
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  const currentUserId = localStorage.getItem("userId") || "";

  return (
    <div className="h-screen flex flex-col">
      <Navbar
        onSearch={(kw) => setKeyword(kw)}
        fullName={user.fullName}
        imageUrl={user.imageUrl}
      />

      {/* Truyền props xuống các route con */}
      <Outlet context={{ user, keyword, currentUserId }} />
      {/* 📞 Incoming Call Modal */}
      <IncomingCallModal
        open={!!incomingCall}
        callerName={incomingCall?.callerName || ""}
        callerImage={incomingCall?.callerImage}
        callType={(incomingCall?.type as "audio" | "video") || "audio"}
        conversationId={incomingCall?.conversationId || ""}
        conversationName={incomingCall?.conversationName}
        onAccept={(uid) => {
          if (!incomingCall) return;
          const url = `/call?channel=${incomingCall.conversationId}&type=${incomingCall.type}&agoraUid=${uid}`;
          window.open(url, "_blank", "width=1000,height=700");
          setIncomingCall(null);
        }}
        onDecline={() => setIncomingCall(null)}
        onTimeout={() => setIncomingCall(null)}
      />
    </div>
  );
}
