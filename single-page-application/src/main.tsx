import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 1. Lấy địa chỉ IP từ biến môi trường
const API_URL = import.meta.env.VITE_API_URL;

// 2. Tự động cập nhật Favicon trong file index.html dựa trên IP
const favicon = document.querySelector("link[rel='icon']");
if (favicon instanceof HTMLLinkElement) {
  favicon.href = `${API_URL}:9000/chat-media/JoChat.svg`;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
