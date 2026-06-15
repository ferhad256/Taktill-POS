import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
  },
  webServer: [
    {
      command: "npm run dev:server",
      port: 8787,
      reuseExistingServer: true,
    },
    {
      command: "npm run dev:web",
      port: 5173,
      reuseExistingServer: true,
    },
  ],
});
