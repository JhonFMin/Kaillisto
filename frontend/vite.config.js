import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [react()],
  server: {
    cors: false,
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:8001",
      "/admin": "http://127.0.0.1:8001",
      "/static": "http://127.0.0.1:8001",
    },
  },
});
