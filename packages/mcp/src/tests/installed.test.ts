import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { listInstalled } from "../app/installed";

let tmp: string;
const savedAppDir = process.env.DAMAT_APP_DIR;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "mcp-installed-"));
  process.env.DAMAT_APP_DIR = tmp;
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
  if (savedAppDir === undefined) delete process.env.DAMAT_APP_DIR;
  else process.env.DAMAT_APP_DIR = savedAppDir;
});

/** Create <appDir>/<dir>/<name>/module.json with the given manifest contents. */
function makeModule(
  dir: string,
  name: string,
  manifest?: unknown,
  raw?: string,
) {
  const moduleDir = join(tmp, dir, name);
  mkdirSync(moduleDir, { recursive: true });
  if (raw !== undefined) {
    writeFileSync(join(moduleDir, "module.json"), raw);
  } else if (manifest !== undefined) {
    writeFileSync(join(moduleDir, "module.json"), JSON.stringify(manifest));
  }
}

describe("listInstalled", () => {
  test("returns [] when the modules dir does not exist", () => {
    expect(listInstalled("src/modules")).toEqual([]);
  });

  test("reads version and description from a valid manifest", () => {
    makeModule("src/modules", "user", {
      version: "1.2.0",
      description: "User module",
    });
    expect(listInstalled("src/modules")).toEqual([
      { id: "user", version: "1.2.0", description: "User module" },
    ]);
  });

  test("marks a module with no manifest", () => {
    makeModule("src/modules", "bare");
    expect(listInstalled("src/modules")).toEqual([
      { id: "bare", version: undefined, description: "(no module.json)" },
    ]);
  });

  test("marks a module with invalid JSON in its manifest", () => {
    makeModule("src/modules", "broken", undefined, "{ not json");
    expect(listInstalled("src/modules")).toEqual([
      {
        id: "broken",
        version: undefined,
        description: "(invalid module.json)",
      },
    ]);
  });

  test("scans the requested custom directory", () => {
    makeModule("custom", "alpha", { version: "0.1.0" });
    const out = listInstalled("custom");
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("alpha");
  });

  test("ignores plain files at the top level (only directories are modules)", () => {
    mkdirSync(join(tmp, "src/modules"), { recursive: true });
    writeFileSync(join(tmp, "src/modules", "README.md"), "x");
    makeModule("src/modules", "real", { version: "1.0.0" });
    const out = listInstalled("src/modules");
    expect(out.map((m) => m.id)).toEqual(["real"]);
  });

  test("lists multiple modules", () => {
    makeModule("src/modules", "a", { version: "1.0.0", description: "A" });
    makeModule("src/modules", "b", { version: "2.0.0", description: "B" });
    const ids = listInstalled("src/modules")
      .map((m) => m.id)
      .sort();
    expect(ids).toEqual(["a", "b"]);
  });
});
