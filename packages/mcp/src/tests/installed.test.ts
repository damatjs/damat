import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { listInstalled } from "../app/installed";

let tmp: string;
const savedAppDir = process.env.DAMAT_APP_DIR;

function writeLock(value: unknown, raw = false): void {
  writeFileSync(
    join(tmp, "damat.lock.json"),
    raw ? String(value) : JSON.stringify(value),
  );
}

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "mcp-installed-"));
  process.env.DAMAT_APP_DIR = tmp;
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
  if (savedAppDir === undefined) delete process.env.DAMAT_APP_DIR;
  else process.env.DAMAT_APP_DIR = savedAppDir;
});

describe("listInstalled", () => {
  test("returns [] when the installer lock does not exist", () => {
    expect(listInstalled()).toEqual([]);
  });

  test("returns sorted module records and ignores other artifact kinds", () => {
    writeLock({
      installations: {
        zeta: {
          artifactId: "inventory",
          kind: "module",
          mode: "source",
          verification: "verified",
          version: "1.2.0",
        },
        app: { artifactId: "api", kind: "backend", mode: "source" },
        alpha: { artifactId: "user", kind: "module", mode: "package" },
      },
    });
    expect(listInstalled()).toEqual([
      {
        id: "alpha",
        artifactId: "user",
        version: undefined,
        mode: "package",
        verification: undefined,
      },
      {
        id: "zeta",
        artifactId: "inventory",
        version: "1.2.0",
        mode: "source",
        verification: "verified",
      },
    ]);
  });

  test("rejects malformed JSON", () => {
    writeLock("{ broken", true);
    expect(() => listInstalled()).toThrow("Invalid damat.lock.json");
  });

  test("rejects a lock without an installations object", () => {
    writeLock({ schemaVersion: 1 });
    expect(() => listInstalled()).toThrow("installations must be an object");
  });
});
