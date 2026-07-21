import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withConfig } from "../config";

describe("withConfig", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `damat-accessor-${crypto.randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
  });
  afterEach(() => rmSync(testDir, { recursive: true, force: true }));

  test("returns null without a loader", async () => {
    expect(await withConfig(undefined, testDir).get()).toBeNull();
  });

  test("caches until clear requests a fresh load", async () => {
    const path = join(testDir, "config");
    writeFileSync(path, "x");
    let loads = 0;
    const accessor = withConfig(
      { file: path, load: async () => ({ value: ++loads }) },
      testDir,
    );
    const first = await accessor.get();
    expect(await accessor.get()).toBe(first as object);
    expect(loads).toBe(1);
    accessor.clear();
    expect(await accessor.get()).toEqual({ value: 2 });
  });
});
