import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    clearMocks: true,
    environment: "jsdom",
    include: [
      "atlas/src/**/*.test.{ts,tsx}",
      "atlas/tests/unit/**/*.test.{ts,tsx}",
    ],
    restoreMocks: true,
  },
});
