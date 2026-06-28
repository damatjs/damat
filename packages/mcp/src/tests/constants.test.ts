import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

import {
  readServerVersion,
  SERVER_VERSION,
  SERVER_NAME,
  DEFAULT_PROTOCOL,
} from "../constants";

describe("readServerVersion", () => {
  test("returns the version field from a readable package.json", () => {
    const dir = mkdtempSync(join(tmpdir(), "damat-mcp-const-"));
    try {
      const file = join(dir, "package.json");
      writeFileSync(file, JSON.stringify({ version: "9.9.9" }));
      expect(readServerVersion(pathToFileURL(file))).toBe("9.9.9");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("falls back to 0.0.0 when the package.json has no version field", () => {
    const dir = mkdtempSync(join(tmpdir(), "damat-mcp-const-"));
    try {
      const file = join(dir, "package.json");
      writeFileSync(file, JSON.stringify({ name: "x" }));
      expect(readServerVersion(pathToFileURL(file))).toBe("0.0.0");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("falls back to 0.0.0 when the file cannot be read (catch branch)", () => {
    const dir = mkdtempSync(join(tmpdir(), "damat-mcp-const-"));
    try {
      // No file written -> readFileSync throws -> catch returns the default.
      const missing = pathToFileURL(join(dir, "package.json"));
      expect(readServerVersion(missing)).toBe("0.0.0");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("constants module surface", () => {
  test("exposes a non-empty server version, name, and protocol", () => {
    expect(typeof SERVER_VERSION).toBe("string");
    expect(SERVER_VERSION.length).toBeGreaterThan(0);
    expect(SERVER_NAME).toBe("damat-mcp");
    expect(DEFAULT_PROTOCOL).toBe("2025-06-18");
  });
});
