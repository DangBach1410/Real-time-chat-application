// src/routes.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './views/Login.tsx';
import Register from './views/Register.tsx';
import Chat from './views/Chat.tsx';
import OAuth2RedirectHandler from './views/OAuth2RedirectHandler.tsx';

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/oauth2/redirect" element={<OAuth2RedirectHandler />} />
      </Routes>
    </Router>
  );
}
