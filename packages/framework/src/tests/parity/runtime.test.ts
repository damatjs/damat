import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveModuleArtifact } from "@damatjs/installer";
import { bootstrap } from "../../bootstrap";
import { initLogger, loadModuleProviders } from "../../services";
import { packageFixture, sourceFixture } from "./fixture";

const roots: string[] = [];
const temp = () => {
  const root = mkdtempSync(join(tmpdir(), "damat-parity-"));
  roots.push(root);
  return root;
};
afterEach(() => {
  roots.splice(0).forEach((root) =>
    rmSync(root, {
      recursive: true,
      force: true,
    }),
  );
  delete (globalThis as any).__damatParity;
});
const config: any = {
  nodeEnv: "test",
  loggerConfig: {},
  http: { port: 0 },
};

test("one module exposes the same source and package runtime capabilities", async () => {
  const sourceRoot = temp();
  const packageRoot = temp();
  sourceFixture(sourceRoot);
  packageFixture(packageRoot);
  const source = resolveModuleArtifact(
    "./src/modules/billing",
    sourceRoot,
    "billing",
  );
  const packaged = resolveModuleArtifact(
    { type: "package", name: "@fixtures/billing" },
    packageRoot,
    "billing",
  );
  await loadModuleProviders(
    new Map([
      ["source", source],
      ["package", packaged],
    ]),
  );
  initLogger({ level: "error", format: "json", timestamp: false });
  const sourceApp = await bootstrap({
    routesDir: join(sourceRoot, "src/api/routes"),
    projectConfig: config,
  });
  const packageApp = await bootstrap({
    routesDir: join(packageRoot, "src/api/routes"),
    routeProviders: [
      {
        routesDir: packaged.routes!,
        basePath: "/billing",
      },
    ],
    projectConfig: config,
  });
  const sourceBody = await (
    await sourceApp.app.request("/api/billing/status")
  ).json();
  const packageBody = await (
    await packageApp.app.request("/api/billing/status")
  ).json();
  expect(sourceBody.mode).toBe("source");
  expect(packageBody.mode).toBe("package");
  expect(Boolean(source.models && source.migrations)).toBe(true);
  expect(Boolean(packaged.models && packaged.migrations)).toBe(true);
  expect((globalThis as any).__damatParity.source).toEqual(
    (globalThis as any).__damatParity.package,
  );
});
