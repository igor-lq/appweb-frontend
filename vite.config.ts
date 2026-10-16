import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // Mesmo padrão do V1 (vite.config.ts da raiz) — dev local fala com o
    // backend real na VPS via Tailscale, sem hardcodar URL absoluta no código.
    proxy: {
      "/api": {
        target: "http://100.111.206.125:8000",
        changeOrigin: true,
      },
    },
  },
});
