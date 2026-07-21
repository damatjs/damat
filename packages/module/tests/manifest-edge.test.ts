import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  validateModuleManifest,
  readModuleManifest,
  validateModuleDir,
} from "../src";

function tmp(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe("validateModuleManifest (edge cases)", () => {
  test("rejects a null manifest", () => {
    expect(() => validateModuleManifest(null)).toThrow(
      "module.json must contain a JSON object",
    );
  });

  test("rejects a non-object manifest", () => {
    expect(() => validateModuleManifest("nope")).toThrow(
      "module.json must contain a JSON object",
    );
  });

  test("rejects malformed modules / non-object packages-null / registry-null", () => {
    expect(() =>
      validateModuleManifest({ name: "x", modules: "user" }),
    ).toThrow('"modules" must be an array');
    expect(() => validateModuleManifest({ name: "x", packages: null })).toThrow(
      '"packages" must be an object',
    );
    expect(() => validateModuleManifest({ name: "x", registry: null })).toThrow(
      '"registry" must be an object',
    );
  });
});

describe("readModuleManifest (edge cases)", () => {
  test("throws a clear error for invalid JSON", () => {
    const dir = tmp("damat-readbad-");
    try {
      writeFileSync(join(dir, "module.json"), "{ not json");
      expect(() => readModuleManifest(dir)).toThrow(/Invalid JSON in/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("validateModuleDir (remaining branches)", () => {
  test("reports a missing module directory", () => {
    const report = validateModuleDir(
      join(tmpdir(), "damat-does-not-exist-xyz"),
    );
    expect(report.valid).toBe(false);
    expect(report.errors[0]).toContain("Module directory not found");
    expect(report.manifest).toBeNull();
  });

  test("surfaces a manifest read error as an error", () => {
    const dir = tmp("damat-dir-badmanifest-");
    try {
      writeFileSync(join(dir, "module.json"), "{ broken");
      const report = validateModuleDir(dir);
      expect(report.valid).toBe(false);
      expect(report.errors.join("\n")).toContain("Invalid JSON");
      expect(report.manifest).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("errors when a declared layout dir does not exist", () => {
    const dir = tmp("damat-dir-declared-");
    try {
      writeFileSync(
        join(dir, "module.json"),
        JSON.stringify({
          name: "user",
          version: "1.0.0",
          description: "d",
          author: { name: "a" },
          registry: { namespace: "n", license: "MIT" },
          paths: { models: "missing-models" },
        }),
      );
      writeFileSync(join(dir, "index.ts"), "// entry\n");
      const report = validateModuleDir(dir);
      expect(report.valid).toBe(false);
      expect(report.errors.join("\n")).toContain(
        'Declared paths.models "missing-models" does not exist',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("warns when the migrations dir exists but has no .sql files", () => {
    const dir = tmp("damat-dir-nosql-");
    try {
      writeFileSync(
        join(dir, "module.json"),
        JSON.stringify({
          name: "user",
          version: "1.0.0",
          description: "d",
          author: { name: "a" },
          registry: { namespace: "n", license: "MIT" },
        }),
      );
      writeFileSync(join(dir, "index.ts"), "// entry\n");
      mkdirSync(join(dir, "models"));
      writeFileSync(join(dir, "models", "user.ts"), "// model\n");
      mkdirSync(join(dir, "migrations"));
      writeFileSync(join(dir, "migrations", "README.md"), "not sql\n");
      const report = validateModuleDir(dir);
      expect(report.valid).toBe(true);
      expect(report.warnings.join("\n")).toContain(
        "contains no .sql migrations",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
