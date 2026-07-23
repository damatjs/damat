import { defineConfig, devices } from "@playwright/test";

const servers = [
  ["web", 3020],
  ["docs", 3030],
  ["registry", 3031],
];

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  expect: { timeout: 7_500 },
  use: {
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: devices["Desktop Chrome"] },
    { name: "mobile-chromium", use: devices["Pixel 7"] },
  ],
  webServer: servers.map(([app, port]) => ({
    command: `bun run --cwd apps/${app} start`,
    name: app,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  })),
});
