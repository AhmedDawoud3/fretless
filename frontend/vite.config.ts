import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": "http://127.0.0.1:8000" },
  },
  test: {
    // Pure-logic *.test.ts runs in node; only component *.test.tsx pays for jsdom.
    projects: [
      {
        extends: true,
        test: { name: "node", environment: "node", include: ["src/**/*.test.ts"] },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["src/testSetup.ts"],
        },
      },
    ],
    testTimeout: 15000,
  },
});
