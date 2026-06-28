import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { listInstalledTool } from "../tools/list-installed";

let tmp: string;
const savedAppDir = process.env.DAMAT_APP_DIR;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "mcp-li-tool-"));
  process.env.DAMAT_APP_DIR = tmp;
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
  if (savedAppDir === undefined) delete process.env.DAMAT_APP_DIR;
  else process.env.DAMAT_APP_DIR = savedAppDir;
});

describe("list_installed tool", () => {
  test("defaults to src/modules and reports the app dir", async () => {
    const moduleDir = join(tmp, "src/modules/user");
    mkdirSync(moduleDir, { recursive: true });
    writeFileSync(
      join(moduleDir, "module.json"),
      JSON.stringify({ version: "1.0.0", description: "User" }),
    );

    const res = await listInstalledTool.handler({});
    expect(res.isError).toBeFalsy();
    const payload = JSON.parse(res.text);
    expect(payload.app).toBe(tmp);
    expect(payload.dir).toBe("src/modules");
    expect(payload.count).toBe(1);
    expect(payload.installed[0]).toEqual({
      id: "user",
      version: "1.0.0",
      description: "User",
    });
  });

  test("honors a custom dir argument", async () => {
    const moduleDir = join(tmp, "mods/alpha");
    mkdirSync(moduleDir, { recursive: true });
    writeFileSync(join(moduleDir, "module.json"), JSON.stringify({ version: "2" }));

    const res = await listInstalledTool.handler({ dir: "mods" });
    const payload = JSON.parse(res.text);
    expect(payload.dir).toBe("mods");
    expect(payload.count).toBe(1);
    expect(payload.installed[0].id).toBe("alpha");
  });

  test("returns an empty list for a missing modules dir", async () => {
    const res = await listInstalledTool.handler({});
    const payload = JSON.parse(res.text);
    expect(payload.count).toBe(0);
    expect(payload.installed).toEqual([]);
  });
});
