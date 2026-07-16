import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { bootstrap } from "../../bootstrap";
import { initLogger } from "../../services";

let root = "";
const write = (path: string, value: string) => {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, value);
};
afterEach(() => rmSync(root, { recursive: true, force: true }));

test("bootstrap mounts an external module route provider", async () => {
  root = mkdtempSync(join(tmpdir(), "damat-route-provider-"));
  const appRoutes = join(root, "src/api/routes");
  mkdirSync(appRoutes, { recursive: true });
  write(
    "package/routes/status/route.ts",
    `
    export const GET = (c) => c.json({ source: "package" });
  `,
  );
  initLogger({ level: "error", format: "json", timestamp: false });
  const { app } = await bootstrap({
    routesDir: appRoutes,
    routeProviders: [
      {
        routesDir: join(root, "package/routes"),
        basePath: "/billing",
      },
    ],
    projectConfig: {
      nodeEnv: "test",
      loggerConfig: {},
      http: { port: 0 },
    },
  });
  const response = await app.request("/api/billing/status");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ source: "package" });
});
