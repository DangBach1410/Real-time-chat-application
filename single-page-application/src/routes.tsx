import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './views/Login.tsx';
import Register from './views/Register.tsx';
import OAuth2RedirectHandler from './views/OAuth2RedirectHandler.tsx';
import ChatLayout from './views/ChatLayout.tsx';
import ChatView from './components/ChatView';
import SearchResult from './components/SearchResult';
import Profile from './components/Profile';
import FriendRequests from './components/FriendRequests';
import EditProfile from "./components/EditProfile";
import ChangePassword from "./components/ChangePassword";
import CallPage from './views/CallPage.tsx';

import { useOutletContext } from "react-router-dom";
import type { UserResponse } from "./helpers/userApi";
import { useParams } from "react-router-dom";
// Hook để lấy context
type ChatContext = { user: UserResponse; keyword: string; currentUserId: string };
function useChatContext() {
  return useOutletContext<ChatContext>();
}

function ChatPage() {
  const { user, currentUserId } = useChatContext();
  const { conversationId } = useParams();
  return (
    <ChatView
      userId={currentUserId}
      userName={user.fullName}
      userAvatar={user.imageUrl}
      userLanguageCode={user.languageCode}
      conversationId={conversationId}  
    />
  );
}

function SearchPage() {
  const { keyword, currentUserId } = useChatContext();
  return <SearchResult currentUserId={currentUserId} keyword={keyword} />;
}

function ProfilePage() {
  const { user, currentUserId } = useChatContext();
  return (
    <Profile
      userId={currentUserId}
      fullName={user.fullName}
      email={user.email}
      imageUrl={user.imageUrl}
      provider={user.provider}
    />
  );
}

function FriendRequestsPage() {
  const { currentUserId } = useChatContext();
  return <FriendRequests currentUserId={currentUserId} />;
}

function EditProfilePage() {
  const { user, currentUserId } = useChatContext();
  return (
    <EditProfile
      userId={currentUserId}
      firstName={user.firstName}
      lastName={user.lastName}
      email={user.email}
      language={user.language}
      languageCode={user.languageCode}
    />
  );
}

function ChangePasswordPage() {
  const { currentUserId } = useChatContext();
  return <ChangePassword userId={currentUserId} />;
}

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/chat" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/oauth2/redirect" element={<OAuth2RedirectHandler />} />

        {/* Layout bọc ngoài */}
        <Route element={<ChatLayout />}>
          <Route path="/chat/:conversationId?" element={<ChatPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/friend-requests" element={<FriendRequestsPage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />
          <Route path="/profile/change-password" element={<ChangePasswordPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/chat" />} />
        <Route path="/call" element={<CallPage />} /> {/* 👈 route cho tab gọi */}
      </Routes>
    </Router>
  );
}
