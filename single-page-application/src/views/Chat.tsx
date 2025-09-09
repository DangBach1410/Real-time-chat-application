import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import ChatView from "../components/ChatView";
import SearchResult from "../components/SearchResult";
import Profile from "../components/Profile";
import FriendRequests from "../components/FriendRequests"; //
import { fetchUserById } from "../helpers/userApi";
import type { UserResponse } from "../helpers/userApi";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp * 1000;
    return Date.now() >= exp;
  } catch (e) {
    return true;
  }
}

export default function Chat() {
  const [view, setView] = useState<"chat" | "search" | "profile" | "friendRequests">("chat");
  const [keyword, setKeyword] = useState<string>("");
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId");

    if (!token || isTokenExpired(token) || !userId) {
      localStorage.clear();
      navigate("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        const data = await fetchUserById(userId);
        setUser(data);
      } catch (err) {
        console.error("Failed to fetch user", err);
        localStorage.clear();
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

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
        onNavigate={setView}
        fullName={user.fullName}
        imageUrl={user.imageUrl}
      />

      {/* Body */}
      {view === "chat" && (
        <ChatView
          userId={currentUserId}
          userName={user.fullName}
          userAvatar={user.imageUrl}
        />
      )}
      {view === "search" && (
        <SearchResult currentUserId={currentUserId} keyword={keyword} />
      )}
      {view === "profile" && (
        <Profile
          userId={currentUserId}
          fullName={user.fullName}
          email={user.email}
          imageUrl={user.imageUrl}
        />
      )}
      {view === "friendRequests" && (
        <FriendRequests currentUserId={currentUserId} />
      )}
    </div>
  );
}
