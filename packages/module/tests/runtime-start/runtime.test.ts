import { describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  PoolManager,
  enableHealthChecks,
  initSpy,
  makeModulePackage,
  seedPool,
  startModuleApp,
  useShutdownHandlers,
} from "./context";

async function withPackage(
  run: (root: string) => Promise<void>,
  migrations = false,
): Promise<void> {
  const root = makeModulePackage(migrations);
  try {
    await run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("startModuleApp", () => {
  test("boots on an ephemeral port without a database", () =>
    withPackage(async (root) => {
      const running = await startModuleApp({ packageDir: root, port: 0 });
      expect(running.manifest.name).toBe("widget");
      expect(running.port).toBeGreaterThan(0);
      expect(running.app).toBeDefined();
      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(PoolManager.isInitialized()).toBe(false);
      await Promise.all([running.stop(), running.stop()]);
    }));

  test("applies migrations when DATABASE_URL is set", () =>
    withPackage(async (root) => {
      process.env.DATABASE_URL = "postgres://fake-never-dialed/db";
      seedPool();
      const running = await startModuleApp({ packageDir: root, port: 0 });
      expect(running.port).toBeGreaterThan(0);
      await running.stop();
    }, true));

  test("wires framework health checks", () =>
    withPackage(async (root) => {
      enableHealthChecks();
      const running = await startModuleApp({ packageDir: root, port: 0 });
      const response = await running.app.request("/health");
      expect([200, 503]).toContain(response.status);
      await running.stop();
    }));

  test("runs all shutdown handlers when one fails", () =>
    withPackage(async (root) => {
      const order: string[] = [];
      useShutdownHandlers([
        {
          handler: async () => {
            order.push("first");
            throw new Error("handler boom");
          },
        },
        { handler: async () => void order.push("second") },
      ]);
      const running = await startModuleApp({ packageDir: root, port: 0 });
      await running.stop();
      expect(order).toEqual(["first", "second"]);
    }));

  test("cleans initialized services when route bootstrap fails", () =>
    withPackage(async (root) => {
      const routes = join(root, "src", "api", "routes", "broken");
      mkdirSync(routes, { recursive: true });
      writeFileSync(
        join(routes, "route.ts"),
        'throw new Error("route boom");\n',
      );
      const cleaned: string[] = [];
      useShutdownHandlers([
        { handler: async () => void cleaned.push("services") },
      ]);
      await expect(
        startModuleApp({ packageDir: root, port: 0 }),
      ).rejects.toThrow("route boom");
      expect(cleaned).toEqual(["services"]);
    }));
});
