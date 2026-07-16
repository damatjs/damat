import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readDamatManifest } from "../../index";

const roots: string[] = [];

function root(): string {
  const value = mkdtempSync(join(tmpdir(), "damat-manifest-"));
  roots.push(value);
  return value;
}

afterEach(() => roots.splice(0).forEach((path) => rmSync(path, { recursive: true })));

describe("readDamatManifest", () => {
  test("reads and validates damat.json", () => {
    const path = root();
    writeFileSync(join(path, "damat.json"), JSON.stringify({
      schemaVersion: 1,
      kind: "kit",
      name: "search",
    }));
    expect(readDamatManifest(path).name).toBe("search");
  });

  test("names missing and malformed files", () => {
    const path = root();
    expect(() => readDamatManifest(path)).toThrow("damat.json not found");
    writeFileSync(join(path, "damat.json"), "{");
    expect(() => readDamatManifest(path)).toThrow("invalid damat.json");
  });
});
