import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Le dev server doit accepter le preview host et proxyer /api et /ws vers le backend.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
    proxy: {
      "/api": { target: "http://localhost:8787", changeOrigin: true },
      "/ws": { target: "ws://localhost:8787", ws: true },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
