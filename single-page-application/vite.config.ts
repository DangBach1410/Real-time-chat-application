import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
    },
    define: {
      global: "window",
    },
  };
});
