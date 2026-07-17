import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bootstrap } from "../../bootstrap";
import { initLogger } from "../../services";

const root = mkdtempSync(join(tmpdir(), "damat-no-admin-routes-"));
const routesDir = join(root, "src/api/routes");

beforeAll(() => {
  mkdirSync(routesDir, { recursive: true });
  initLogger({ level: "error", format: "json", timestamp: false });
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

test("framework mounts no job or event administration routes", async () => {
  const { app } = await bootstrap({
    routesDir,
    projectConfig: {
      nodeEnv: "test",
      loggerConfig: {},
      http: { port: 0 },
    },
  });
  for (const path of ["/api/admin/jobs", "/api/admin/events"]) {
    expect((await app.request(path)).status).toBe(404);
  }
});
