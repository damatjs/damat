import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  validateModuleManifest,
  readModuleManifest,
  validateModuleDir,
} from "../src";

function makeModuleDir(manifest: unknown, files: string[] = []): string {
  const dir = mkdtempSync(join(tmpdir(), "damat-module-fixture-"));
  writeFileSync(join(dir, "module.json"), JSON.stringify(manifest));
  for (const file of files) {
    const full = join(dir, file);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, "// fixture\n");
  }
  return dir;
}

describe("validateModuleManifest", () => {
  test("accepts a minimal valid manifest", () => {
    const manifest = validateModuleManifest({ name: "user" });
    expect(manifest.name).toBe("user");
  });

  test("accepts the full shape including registry metadata", () => {
    const manifest = validateModuleManifest({
      name: "billing-stripe",
      version: "1.2.0",
      description: "Stripe billing",
      author: { name: "damatjs", url: "https://github.com/damatjs" },
      env: [{ name: "STRIPE_KEY", required: true }],
      packages: { stripe: "^14.0.0" },
      modules: ["user"],
      pairsWith: ["user"],
      registry: { namespace: "damatjs", license: "MIT", keywords: ["billing"] },
    });
    expect(manifest.registry?.namespace).toBe("damatjs");
    expect(manifest.pairsWith).toEqual(["user"]);
  });

  test("accepts author as a string or an object, rejects other shapes", () => {
    expect(
      validateModuleManifest({ name: "x", author: "Jane <j@x.co>" }).author,
    ).toBe("Jane <j@x.co>");
    expect(
      validateModuleManifest({ name: "x", author: { name: "Jane" } }).author,
    ).toEqual({ name: "Jane" });
    expect(() => validateModuleManifest({ name: "x", author: 42 })).toThrow(
      '"author" must be a string or an object with a "name"',
    );
    expect(() => validateModuleManifest({ name: "x", author: {} })).toThrow(
      '"author"',
    );
  });

  test("rejects missing or malformed names", () => {
    expect(() => validateModuleManifest({})).toThrow('requires a "name"');
    expect(() => validateModuleManifest({ name: "Bad Name" })).toThrow(
      "kebab-case",
    );
    expect(() => validateModuleManifest({ name: "UserModule" })).toThrow(
      "kebab-case",
    );
  });

  test("rejects malformed env / packages / registry", () => {
    expect(() =>
      validateModuleManifest({ name: "x", env: "STRIPE_KEY" }),
    ).toThrow('"env" must be an array');
    expect(() =>
      validateModuleManifest({ name: "x", env: [{ required: true }] }),
    ).toThrow('with a "name"');
    expect(() =>
      validateModuleManifest({ name: "x", packages: ["stripe"] }),
    ).toThrow();
    expect(() =>
      validateModuleManifest({ name: "x", registry: "MIT" }),
    ).toThrow('"registry" must be an object');
  });

  test("rejects a non-array pairsWith", () => {
    expect(() =>
      validateModuleManifest({ name: "x", pairsWith: "user" }),
    ).toThrow('"pairsWith" must be an array');
  });
});

describe("readModuleManifest", () => {
  test("reads from a directory", () => {
    const dir = makeModuleDir({ name: "user", version: "0.0.1" });
    try {
      expect(readModuleManifest(dir).version).toBe("0.0.1");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fails clearly when module.json is missing", () => {
    expect(() => readModuleManifest(tmpdir())).toThrow("not a damat module");
  });
});

describe("validateModuleDir (registry readiness)", () => {
  test("a complete module is valid with no warnings", () => {
    const dir = makeModuleDir(
      {
        name: "user",
        version: "0.0.1",
        description: "Users",
        author: { name: "damatjs" },
        registry: { namespace: "damatjs", license: "MIT" },
      },
      ["index.ts", "models/user.ts", "migrations/Migration1_Init.sql"],
    );
    try {
      const report = validateModuleDir(dir);
      expect(report.valid).toBe(true);
      expect(report.errors).toEqual([]);
      expect(report.warnings).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("missing entry is an error", () => {
    const dir = makeModuleDir({ name: "user" });
    try {
      const report = validateModuleDir(dir);
      expect(report.valid).toBe(false);
      expect(report.errors.join("\n")).toContain(
        'Entry "./index.ts" not found',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("registry gaps are warnings, not errors", () => {
    const dir = makeModuleDir({ name: "user" }, ["index.ts"]);
    try {
      const report = validateModuleDir(dir);
      expect(report.valid).toBe(true);
      expect(report.warnings.join("\n")).toContain('"version"');
      expect(report.warnings.join("\n")).toContain('"author"');
      expect(report.warnings.join("\n")).toContain("registry.license");
      expect(report.warnings.join("\n")).toContain("registry.namespace");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("models without migrations warns", () => {
    const dir = makeModuleDir(
      {
        name: "user",
        version: "1.0.0",
        description: "d",
        registry: { namespace: "n", license: "MIT" },
      },
      ["index.ts", "models/user.ts"],
    );
    try {
      const report = validateModuleDir(dir);
      expect(report.valid).toBe(true);
      expect(report.warnings.join("\n")).toContain('no "./migrations"');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
