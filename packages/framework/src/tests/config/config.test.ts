import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { defineConfig } from "../../config/define";
import { loadConfig, loadConfigAsync, clearConfigCache } from "../../config/loader";
import type { AppConfig } from "../../config/types";

const baseConfig: AppConfig = {
  projectConfig: {
    http: { port: 3000, host: "localhost" },
  },
};

let cwd: string;

beforeEach(() => {
  // Loader caches the resolved config in a module-level variable; reset between
  // tests so each runs against a clean cache. Each test also gets its own cwd.
  clearConfigCache();
  cwd = mkdtempSync(join(tmpdir(), "damat-config-"));
});

afterEach(() => {
  clearConfigCache();
  rmSync(cwd, { recursive: true, force: true });
});

describe("defineConfig", () => {
  it("returns the same config object it is given (identity helper)", () => {
    const result = defineConfig(baseConfig);
    expect(result).toBe(baseConfig);
  });
});

describe("loadConfig (sync)", () => {
  it("throws when the config file is missing", () => {
    expect(() => loadConfig(cwd)).toThrow("Config file not found");
  });

  it("throws 'not supported' when the config file exists (sync loading unsupported)", () => {
    writeFileSync(join(cwd, "damat.config.ts"), "export default {};");
    expect(() => loadConfig(cwd)).toThrow(
      "Synchronous config loading is not supported. Use loadConfigAsync() instead.",
    );
  });
});

describe("loadConfigAsync", () => {
  it("throws when the config file is missing", async () => {
    await expect(loadConfigAsync(cwd)).rejects.toThrow("Config file not found");
  });

  it("loads a valid config that exports a default with projectConfig", async () => {
    writeFileSync(
      join(cwd, "damat.config.ts"),
      `export default { projectConfig: { http: { port: 4321, host: "0.0.0.0" } } };`,
    );

    const config = await loadConfigAsync(cwd);
    expect(config.projectConfig.http.port).toBe(4321);
    expect(config.projectConfig.http.host).toBe("0.0.0.0");
  });

  it("rejects with a wrapped error when projectConfig is missing", async () => {
    writeFileSync(join(cwd, "damat.config.ts"), `export default { nope: true };`);
    await expect(loadConfigAsync(cwd)).rejects.toThrow(
      "Failed to load config: Invalid config: missing projectConfig",
    );
  });

  it("caches the loaded config and returns it on subsequent calls", async () => {
    writeFileSync(
      join(cwd, "damat.config.ts"),
      `export default { projectConfig: { http: { port: 1111, host: "h" } } };`,
    );

    const first = await loadConfigAsync(cwd);
    // Even pointing at a different (non-existent) cwd, the cache short-circuits.
    const second = await loadConfigAsync(join(cwd, "elsewhere"));
    expect(second).toBe(first);
  });
});

describe("clearConfigCache", () => {
  it("forces a fresh load after clearing", async () => {
    const fileA = join(cwd, "damat.config.ts");
    writeFileSync(
      fileA,
      `export default { projectConfig: { http: { port: 100, host: "a" } } };`,
    );
    const first = await loadConfigAsync(cwd);
    expect(first.projectConfig.http.port).toBe(100);

    clearConfigCache();

    // A second temp dir with a different config; after clearing, it reloads.
    const cwd2 = mkdtempSync(join(tmpdir(), "damat-config-2-"));
    try {
      writeFileSync(
        join(cwd2, "damat.config.ts"),
        `export default { projectConfig: { http: { port: 200, host: "b" } } };`,
      );
      const second = await loadConfigAsync(cwd2);
      expect(second.projectConfig.http.port).toBe(200);
      expect(second).not.toBe(first);
    } finally {
      rmSync(cwd2, { recursive: true, force: true });
    }
  });
});
