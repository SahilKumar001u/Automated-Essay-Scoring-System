import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    // same-origin /api in dev and in Docker (nginx), so no CORS is needed anywhere
    proxy: { "/api": "http://localhost:8010" },
  },
});
