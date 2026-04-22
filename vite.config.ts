import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  root: "renderer",
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "shared"),
      "@": resolve(__dirname, "renderer/src"),
    },
  },
  build: {
    outDir: "../dist/renderer",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
