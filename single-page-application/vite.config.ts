import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(() => {

  return {
    plugins: [react()],
    server: {
      port: 4000,
      allowedHosts: [
        "zochat.duckdns.org",
      ],
      host: '0.0.0.0', // Cho phép truy cập từ domain ngoài
      https: {
        // Đảm bảo tên file khớp với file vừa sinh ra
        key: fs.readFileSync(path.resolve(__dirname, './zochat.duckdns.org+2-key.pem')),
        cert: fs.readFileSync(path.resolve(__dirname, './zochat.duckdns.org+2.pem')),
      },
    },
    define: {
      global: "window",
    },
  };
});
