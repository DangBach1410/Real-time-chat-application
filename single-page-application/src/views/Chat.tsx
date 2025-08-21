import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import ChatView from "../components/ChatView";
import SearchResult from "../components/SearchResult";
import Profile from "../components/Profile";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp * 1000; // exp trong JWT tính bằng giây
    return Date.now() >= exp;
  } catch (e) {
    return true;
  }
}

export default function Chat() {
  const [view, setView] = useState<"chat" | "search" | "profile">("chat");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (!token || isTokenExpired(token)) {
      localStorage.clear();
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="h-screen flex flex-col">
      <Navbar
        onSearch={(value) => {
          setSearchQuery(value);
          setView("search");
        }}
        onNavigate={setView}
      />

      {/* Body */}
      {view === "chat" && <ChatView />}
      {view === "search" && <SearchResult query={searchQuery} />}
      {view === "profile" && <Profile />}
    </div>
  );
}
