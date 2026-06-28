import { describe, expect, test } from "bun:test";

import { summarizeEntry } from "../registry/summarize";
import type { RegistryModuleEntry } from "../registry/types";

describe("summarizeEntry", () => {
  test("surfaces the full set of fields for a complete entry", () => {
    const entry: RegistryModuleEntry = {
      name: "user",
      source: "github:damatjs/user",
      description: "User management",
      owner: { namespace: "damatjs", verified: true },
      verification: { status: "verified" },
      versions: { "0.1.0": "src1", "0.2.0": { source: "src2" } },
      latest: "0.2.0",
      keywords: ["auth", "user"],
      license: "MIT",
      homepage: "https://example.com",
      repository: "https://github.com/damatjs/user",
    };

    expect(summarizeEntry("damatjs/user", entry)).toEqual({
      ref: "damatjs/user",
      description: "User management",
      latest: "0.2.0",
      versions: ["0.1.0", "0.2.0"],
      verification: "verified",
      owner: "damatjs",
      keywords: ["auth", "user"],
      license: "MIT",
      source: "github:damatjs/user",
      homepage: "https://example.com",
      repository: "https://github.com/damatjs/user",
    });
  });

  test("defaults verification to 'unverified' when absent", () => {
    const entry: RegistryModuleEntry = { source: "x" };
    expect(summarizeEntry("user", entry).verification).toBe("unverified");
  });

  test("leaves versions undefined when entry has none", () => {
    const entry: RegistryModuleEntry = { source: "x" };
    expect(summarizeEntry("user", entry).versions).toBeUndefined();
  });

  test("maps versions to their keys", () => {
    const entry: RegistryModuleEntry = {
      source: "x",
      versions: { "1.0.0": "a", "2.0.0": "b" },
    };
    expect(summarizeEntry("user", entry).versions).toEqual(["1.0.0", "2.0.0"]);
  });

  test("uses the provided key as ref, not entry.name", () => {
    const entry: RegistryModuleEntry = { name: "internal", source: "x" };
    expect(summarizeEntry("damatjs/user", entry).ref).toBe("damatjs/user");
  });

  test("omits owner when no owner object is present", () => {
    const entry: RegistryModuleEntry = { source: "x" };
    expect(summarizeEntry("user", entry).owner).toBeUndefined();
  });
});
