import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { loadConfig } from "../config";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Config Loader", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `damat-cli-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("should return null when no config file specified", async () => {
    const result = await loadConfig(undefined, testDir);
    expect(result).toBeNull();
  });

  test("should return null when config file does not exist", async () => {
    const result = await loadConfig({ file: "nonexistent.config.ts" }, testDir);
    expect(result).toBeNull();
  });

  test("should load config from TypeScript file", async () => {
    const configPath = join(testDir, "test.config.ts");
    writeFileSync(configPath, "export default { name: 'test', value: 42 };");

    const result = await loadConfig({ file: "test.config.ts" }, testDir);

    expect(result).toEqual({ name: "test", value: 42 });
  });

  test("should load config from JSON file", async () => {
    const configPath = join(testDir, "test.config.json");
    writeFileSync(configPath, '{"name": "test", "value": 42}');

    const result = await loadConfig({ file: "test.config.json" }, testDir);

    expect(result).toEqual({ name: "test", value: 42 });
  });

  test("should load config from function export", async () => {
    const configPath = join(testDir, "func.config.ts");
    writeFileSync(
      configPath,
      "export default () => ({ name: 'function', value: 123 });",
    );

    const result = await loadConfig({ file: "func.config.ts" }, testDir);

    expect(result).toEqual({ name: "function", value: 123 });
  });

  test("should use custom loader", async () => {
    const configPath = join(testDir, "custom.config");
    writeFileSync(configPath, "custom-config-content");

    const result = await loadConfig(
      {
        file: "custom.config",
        load: async (filePath) => {
          return { custom: true, path: filePath };
        },
      },
      testDir,
    );

    expect(result).toEqual({ custom: true, path: configPath });
  });

  test("should try multiple config files", async () => {
    const configPath = join(testDir, "secondary.config.ts");
    writeFileSync(configPath, "export default { source: 'secondary' };");

    const result = await loadConfig(
      { file: ["primary.config.ts", "secondary.config.ts"] },
      testDir,
    );

    expect(result).toEqual({ source: "secondary" });
  });

  test("should handle absolute paths", async () => {
    const configPath = join(testDir, "absolute.config.ts");
    writeFileSync(configPath, "export default { absolute: true };");

    const result = await loadConfig({ file: configPath }, testDir);
    expect(result).toEqual({ absolute: true });
  });
});
