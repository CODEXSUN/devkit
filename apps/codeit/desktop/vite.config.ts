import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  clearScreen: false,
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  server: {
    host: "127.0.0.1",
    port: 15221,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});