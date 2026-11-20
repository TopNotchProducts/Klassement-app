import { loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    // Laadt .env.local zodat tests tegen klassement-dev draaien (zie CLAUDE.md).
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
