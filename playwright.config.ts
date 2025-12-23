import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.TARGET_URL || "https://generalcopper.github.io/tabellone-produzione-live/hub_linea_polveri.html";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit-mobile",
      use: { ...devices["iPhone 13"] },
    },
  ],
});
