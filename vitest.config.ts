import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  test: {
    include: ["tests/**/*.test.ts"],
    // Laadt .env.local zodat tests tegen klassement-dev draaien (zie CLAUDE.md).
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
