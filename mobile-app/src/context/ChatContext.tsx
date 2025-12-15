// src/context/ChatContext.tsx
import React, { createContext, useContext } from "react";
import type { UserResponse } from "../api/userApi";

type ChatContextType = {
  user: UserResponse;
  keyword: string;
  currentUserId: string;
  setUser: (u: UserResponse) => void;
};

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChatContext must be used within ChatProvider");
  return context;
};
