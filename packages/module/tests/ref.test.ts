import { describe, expect, test } from "bun:test";
import { parseModuleRef, formatModuleRef } from "../src";

describe("module refs", () => {
  test("name only", () => {
    expect(parseModuleRef("user")).toEqual({ name: "user" });
  });

  test("name with version", () => {
    expect(parseModuleRef("user@0.2.0")).toEqual({
      name: "user",
      version: "0.2.0",
    });
  });

  test("namespaced", () => {
    expect(parseModuleRef("damatjs/user")).toEqual({
      namespace: "damatjs",
      name: "user",
    });
  });

  test("namespaced with tag", () => {
    expect(parseModuleRef("damatjs/user@latest")).toEqual({
      namespace: "damatjs",
      name: "user",
      version: "latest",
    });
  });

  test("rejects non-ref strings", () => {
    expect(parseModuleRef("./local/path")).toBeNull();
    expect(parseModuleRef("https://github.com/a/b.git")).toBeNull();
    expect(parseModuleRef("Bad Name")).toBeNull();
    expect(parseModuleRef("a/b/c")).toBeNull();
  });

  test("round-trips through format", () => {
    for (const input of ["user", "user@0.2.0", "damatjs/user", "damatjs/user@latest"]) {
      expect(formatModuleRef(parseModuleRef(input)!)).toBe(input);
    }
  });
});
