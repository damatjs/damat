import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { loadConfig, clearConfigCache, withConfig } from "../config";
import { ConfigLoadError } from "../errors";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("loadConfig - error and edge paths", () => {
  let testDir: string;

  beforeEach(() => {
    clearConfigCache();
    testDir = join(
      tmpdir(),
      `damat-cli-config-extra-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    clearConfigCache();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("wraps a throwing custom loader in a ConfigLoadError", async () => {
    const configPath = join(testDir, "bad.config");
    writeFileSync(configPath, "x");

    const promise = loadConfig(
      {
        file: "bad.config",
        load: async () => {
          throw new Error("loader exploded");
        },
      },
      testDir,
    );

    const err = (await promise.catch((e) => e)) as Error & { cause?: Error };
    expect(err).toBeInstanceOf(ConfigLoadError);
    // The file path stays in the message; the underlying error is the `cause`.
    expect(err.message).toContain(configPath);
    expect(err.cause?.message).toBe("loader exploded");
  });

  test("wraps a module that throws on import in a ConfigLoadError", async () => {
    const configPath = join(testDir, "throws.config.ts");
    writeFileSync(configPath, "throw new Error('module side-effect failure');");

    await expect(
      loadConfig({ file: "throws.config.ts" }, testDir),
    ).rejects.toBeInstanceOf(ConfigLoadError);
  });

  test("returns null when none of multiple candidate files exist", async () => {
    const result = await loadConfig(
      { file: ["a.config.ts", "b.config.ts"] },
      testDir,
    );
    expect(result).toBeNull();
  });

  test("returns the cached value on subsequent calls even with a different loader", async () => {
    const configPath = join(testDir, "first.config.ts");
    writeFileSync(configPath, "export default { first: true };");

    const first = await loadConfig({ file: "first.config.ts" }, testDir);
    expect(first).toEqual({ first: true });

    // Cache short-circuits before touching the loader, so this returns the cached object.
    const second = await loadConfig({ file: "nonexistent.config.ts" }, testDir);
    expect(second).toBe(first as object);
  });

  test("awaits an async function export and caches its resolved value", async () => {
    const configPath = join(testDir, "async.config.ts");
    writeFileSync(
      configPath,
      "export default async () => ({ async: true, n: 7 });",
    );

    const result = await loadConfig({ file: "async.config.ts" }, testDir);
    expect(result).toEqual({ async: true, n: 7 });
  });
});

describe("withConfig", () => {
  let testDir: string;

  beforeEach(() => {
    clearConfigCache();
    testDir = join(
      tmpdir(),
      `damat-cli-withconfig-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    clearConfigCache();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("get() resolves to null when no loader is configured", async () => {
    const handle = withConfig(undefined);
    expect(await handle.get()).toBeNull();
  });

  test("get() loads via a custom loader and clear() forces a fresh load", async () => {
    const configPath = join(testDir, "wc.config");
    writeFileSync(configPath, "x");

    // A custom loader lets us observe load count deterministically (no module cache).
    let loadCount = 0;
    const handle = withConfig({
      file: configPath,
      load: async () => ({ value: ++loadCount }),
    });

    const first = await handle.get();
    expect(first).toEqual({ value: 1 });

    // Cached: same reference and no second load until cleared.
    const second = await handle.get();
    expect(second).toBe(first as object);
    expect(loadCount).toBe(1);

    handle.clear();
    const third = await handle.get();
    expect(third).toEqual({ value: 2 });
    expect(loadCount).toBe(2);
    expect(third).not.toBe(first as object);
  });
});
