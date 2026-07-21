import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
  test("reports lockfile module installations and app location", async () => {
    writeFileSync(
      join(tmp, "damat.lock.json"),
      JSON.stringify({
        installations: {
          user: {
            artifactId: "user",
            kind: "module",
            mode: "source",
            version: "1.0.0",
          },
        },
      }),
    );
    const res = await listInstalledTool.handler({});
    const payload = JSON.parse(res.text);
    expect(res.isError).toBeFalsy();
    expect(payload.app).toBe(tmp);
    expect(payload.count).toBe(1);
    expect(payload.installed[0]).toMatchObject({
      id: "user",
      artifactId: "user",
      version: "1.0.0",
    });
  });

  test("returns an empty list when no lock exists", async () => {
    const payload = JSON.parse((await listInstalledTool.handler({})).text);
    expect(payload).toMatchObject({ count: 0, installed: [] });
  });
});
