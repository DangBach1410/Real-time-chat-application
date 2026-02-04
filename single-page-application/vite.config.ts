import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [react()],
    server: {
      port: 4000,
      allowedHosts: [
        "nilsa-tapestried-nonjudicially.ngrok-free.dev",
      ],
      proxy: {
        "/ws-presence": {
          target: `${env.VITE_API_URL}:8085`,
          ws: true,
          changeOrigin: true,
        },
        "/ws": {
          target: `${env.VITE_API_URL}:8083`,
          ws: true,
          changeOrigin: true,
        },
      },
    },
    define: {
      global: "window",
    },
  };
});
