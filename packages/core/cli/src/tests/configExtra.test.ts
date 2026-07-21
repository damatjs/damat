import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../config";
import { ConfigLoadError } from "../errors";

describe("loadConfig error and edge paths", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `damat-config-${crypto.randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
  });
  afterEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
  });

  test("wraps a throwing custom loader", async () => {
    const configPath = join(testDir, "bad.config");
    writeFileSync(configPath, "x");
    const promise = loadConfig(
      {
        file: "bad.config",
        load: async () => {
          throw new Error("exploded");
        },
      },
      testDir,
    );
    const error = (await promise.catch((value) => value)) as Error & {
      cause?: Error;
    };
    expect(error).toBeInstanceOf(ConfigLoadError);
    expect(error.message).toContain(configPath);
    expect(error.cause?.message).toBe("exploded");
  });

  test("wraps a module that throws while importing", async () => {
    writeFileSync(
      join(testDir, "throws.config.ts"),
      "throw new Error('module failure');",
    );
    await expect(
      loadConfig({ file: "throws.config.ts" }, testDir),
    ).rejects.toBeInstanceOf(ConfigLoadError);
  });

  test("returns null when no candidate exists", async () => {
    const result = await loadConfig(
      { file: ["a.config.ts", "b.config.ts"] },
      testDir,
    );
    expect(result).toBeNull();
  });

  test("loads each request independently", async () => {
    writeFileSync(
      join(testDir, "first.config.ts"),
      "export default { first: true };",
    );
    expect(await loadConfig({ file: "first.config.ts" }, testDir)).toEqual({
      first: true,
    });
    expect(await loadConfig({ file: "missing.config.ts" }, testDir)).toBeNull();
  });

  test("awaits an async function export", async () => {
    writeFileSync(
      join(testDir, "async.config.ts"),
      "export default async () => ({ async: true, n: 7 });",
    );
    expect(await loadConfig({ file: "async.config.ts" }, testDir)).toEqual({
      async: true,
      n: 7,
    });
  });
});
