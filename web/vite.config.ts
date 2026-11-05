import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./", // works at both danimander.ca/ and wklumpen.github.io/danimander/
  server: { fs: { allow: [".."] } }, // boards/ lives at repo root
});
