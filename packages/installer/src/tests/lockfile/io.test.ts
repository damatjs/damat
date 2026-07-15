import { describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readInstallerLock,
  writeInstallerLock,
  type InstallerLock,
} from "../../index";

const empty: InstallerLock = { schemaVersion: 1, installations: {} };

describe("installer lockfile IO", () => {
  test("returns an empty lock when missing and writes deterministic JSON", () => {
    const project = mkdtempSync(join(tmpdir(), "installer-lock-"));
    expect(readInstallerLock(project)).toEqual(empty);
    const lock = {
      schemaVersion: 1 as const,
      installations: { z: {} as never, a: {} as never },
    };
    expect(() => writeInstallerLock(project, lock)).toThrow();
    writeInstallerLock(project, empty);
    expect(readFileSync(join(project, "damat.lock.json"), "utf8")).toBe(
      '{\n  "installations": {},\n  "schemaVersion": 1\n}\n',
    );
  });

  test("rejects malformed JSON", () => {
    const project = mkdtempSync(join(tmpdir(), "installer-lock-bad-"));
    writeFileSync(join(project, "damat.lock.json"), "{");
    expect(() => readInstallerLock(project)).toThrow("damat.lock.json");
  });

  test("preserves the old lock and removes temp files when rename fails", () => {
    const project = mkdtempSync(join(tmpdir(), "installer-lock-fail-"));
    writeInstallerLock(project, empty);
    const rename = () => {
      throw new Error("rename failed");
    };
    expect(() => writeInstallerLock(project, empty, { rename })).toThrow(
      "rename failed",
    );
    expect(readInstallerLock(project)).toEqual(empty);
    expect(
      readdirSync(project).filter((name) => name.includes(".tmp")),
    ).toEqual([]);
    expect(existsSync(join(project, "damat.lock.json"))).toBeTrue();
  });
});
