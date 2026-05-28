import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react-router-dom") ||
            id.includes("node_modules/react-redux") ||
            id.includes("node_modules/react-device-detect") ||
            id.includes("node_modules/@reduxjs/toolkit") ||
            id.includes("node_modules/zustand")
          ) {
            return "react_vendor";
          }
          if (
            id.includes("node_modules/i18next") ||
            id.includes("node_modules/react-i18next") ||
            id.includes("node_modules/i18next-browser-languagedetector")
          ) {
            return "lang";
          }
          if (id.includes("node_modules/dexie")) return "storage";
          if (id.includes("node_modules/@hcaptcha/react-hcaptcha"))
            return "captcha";
          if (
            id.includes("node_modules/@msgpack/msgpack") ||
            id.includes("node_modules/crypto-js") ||
            id.includes("node_modules/music-metadata")
          )
            return "data";
          if (
            id.includes("node_modules/framer-motion") ||
            id.includes("node_modules/lottie-react") ||
            id.includes("node_modules/ldrs")
          )
            return "ui";
          if (
            id.includes("node_modules/prism-react-renderer") ||
            id.includes("node_modules/react-code-block")
          )
            return "code";
        },
      },
    },
  },
});
