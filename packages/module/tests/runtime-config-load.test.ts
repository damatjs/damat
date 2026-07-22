import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadModuleConfig, locateModuleDir } from "../src";

function fixture(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

async function withFixture(
  prefix: string,
  run: (directory: string) => Promise<void> | void,
): Promise<void> {
  const directory = fixture(prefix);
  try {
    await run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("loadModuleConfig", () => {
  test("returns an empty config when the file is absent", () =>
    withFixture("damat-cfg-empty-", async (directory) => {
      expect(await loadModuleConfig(directory)).toEqual({});
    }));

  test("loads default and named config exports", async () => {
    await withFixture("damat-cfg-default-", async (directory) => {
      writeFileSync(
        join(directory, "module.config.ts"),
        "export default { projectConfig: { nodeEnv: 'production' } };\n",
      );
      expect((await loadModuleConfig(directory)).projectConfig?.nodeEnv).toBe(
        "production",
      );
    });
    await withFixture("damat-cfg-named-", async (directory) => {
      writeFileSync(
        join(directory, "module.config.ts"),
        "export const config = { projectConfig: { nodeEnv: 'test' } };\n",
      );
      expect((await loadModuleConfig(directory)).projectConfig?.nodeEnv).toBe(
        "test",
      );
    });
  });

  test("rejects a non-object export", () =>
    withFixture("damat-cfg-bad-", async (directory) => {
      writeFileSync(
        join(directory, "module.config.ts"),
        "export default 42;\n",
      );
      await expect(loadModuleConfig(directory)).rejects.toThrow(
        "must default-export defineModuleConfig",
      );
    }));
});

describe("locateModuleDir", () => {
  test("finds root and src manifests", async () => {
    await withFixture("damat-locate-src-", (directory) => {
      mkdirSync(join(directory, "src"));
      writeFileSync(join(directory, "src", "module.json"), "{}");
      expect(locateModuleDir(directory)).toBe(join(directory, "src"));
    });
    await withFixture("damat-locate-root-", (directory) => {
      writeFileSync(join(directory, "module.json"), "{}");
      expect(locateModuleDir(directory)).toBe(directory);
    });
  });

  test("rejects a directory without a manifest", () =>
    withFixture("damat-locate-none-", (directory) => {
      expect(() => locateModuleDir(directory)).toThrow(
        "not a damat module package",
      );
    }));
});
