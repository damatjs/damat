import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initializeServices } from "../../services/index";
import { clearModules } from "../../services/moduleService";
import { resolveLinkedModule, setLinkModuleResolver } from "@damatjs/link";
import type { AppConfig } from "../../config";

const SCRATCH = tmpdir();

let cwd: string;

function baseConfig(
  overrides: Partial<AppConfig["projectConfig"]> = {},
): AppConfig {
  return {
    projectConfig: {
      http: { port: 3000, host: "localhost" },
      ...overrides,
    },
  };
}

beforeEach(() => {
  clearModules();
  cwd = mkdtempSync(join(SCRATCH, "damat-initsvc-"));
});

afterEach(() => {
  clearModules();
  setLinkModuleResolver(null as never);
  rmSync(cwd, { recursive: true, force: true });
});

function writeModule(relPath: string, serviceLiteral: string) {
  const file = join(cwd, relPath);
  writeFileSync(
    file,
    `export default { service: ${serviceLiteral}, init() { return this.service; } };`,
  );
  return relPath;
}

describe("initializeServices (no database / no redis)", () => {
  it("wires logger + 'not configured' health checks and a logger shutdown handler", async () => {
    const instances = await initializeServices(baseConfig(), cwd);

    expect(instances.shutdownHandlers.map((h) => h.name)).toEqual(["logger"]);

    // Both health checks report "not configured" when no URL is set.
    const db = await instances.healthChecks!.database!();
    const redis = await instances.healthChecks!.redis!();
    expect(db.status).toBe("not configured");
    expect(redis.status).toBe("not configured");

    // The logger shutdown handler runs cleanly.
    await instances.shutdownHandlers
      .find((h) => h.name === "logger")!
      .handler();

    // No modules were configured.
    expect(instances.modules).toBeUndefined();
  });

  it("initialises configured modules and exposes them on the result", async () => {
    const rel = writeModule("counter.ts", `{ tag: "counter" }`);

    const config = baseConfig();
    config.modules = { counter: { resolve: `./${rel}` } };

    const instances = await initializeServices(config, cwd);

    expect(instances.modules).toBeInstanceOf(Map);
    expect(instances.modules!.has("counter")).toBe(true);

    // initializeServices wires the link module resolver to getModule. Resolving a
    // registered module exercises that resolver callback.
    expect(resolveLinkedModule("counter")).toEqual({ tag: "counter" });
  });

  it("registers link-module directories alongside regular modules", async () => {
    // A link directory is a folder whose index.ts default-exports the module.
    mkdirSync(join(cwd, "links"), { recursive: true });
    writeFileSync(
      join(cwd, "links", "index.ts"),
      `export default { service: { tag: "link" }, init() { return this.service; } };
       export const models = {};`,
    );

    const config = baseConfig();
    config.links = "./links";

    const instances = await initializeServices(config, cwd);

    expect(instances.modules).toBeInstanceOf(Map);
    // A single links path is registered under the id "link".
    expect(instances.modules!.has("link")).toBe(true);
  });
});
