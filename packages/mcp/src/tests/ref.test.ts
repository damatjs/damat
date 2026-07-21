import { describe, expect, test } from "bun:test";

import { formatModuleRef, parseModuleRef } from "../registry/ref";

describe("parseModuleRef", () => {
  test("parses a bare name", () => {
    expect(parseModuleRef("user")).toEqual({ name: "user" });
  });

  test("parses namespace/name", () => {
    expect(parseModuleRef("damatjs/user")).toEqual({
      namespace: "damatjs",
      name: "user",
    });
  });

  test("parses namespace/name@version", () => {
    expect(parseModuleRef("damatjs/user@0.2.0")).toEqual({
      namespace: "damatjs",
      name: "user",
      version: "0.2.0",
    });
  });

  test("parses name@version without namespace", () => {
    expect(parseModuleRef("user@1.0.0")).toEqual({
      name: "user",
      version: "1.0.0",
    });
  });

  test("accepts version ranges with operators", () => {
    expect(parseModuleRef("user@^1.2.0")).toEqual({
      name: "user",
      version: "^1.2.0",
    });
  });

  test("trims surrounding whitespace", () => {
    expect(parseModuleRef("  user  ")).toEqual({ name: "user" });
  });

  test("allows digits and hyphens in names", () => {
    expect(parseModuleRef("billing-stripe2")).toEqual({
      name: "billing-stripe2",
    });
  });

  test("rejects names that start with a digit", () => {
    expect(parseModuleRef("2cool")).toBeNull();
  });

  test("rejects uppercase", () => {
    expect(parseModuleRef("User")).toBeNull();
  });

  test("rejects empty string", () => {
    expect(parseModuleRef("")).toBeNull();
  });

  test("rejects multi-segment paths", () => {
    expect(parseModuleRef("a/b/c")).toBeNull();
  });
});

describe("formatModuleRef", () => {
  test("formats a bare name", () => {
    expect(formatModuleRef({ name: "user" })).toBe("user");
  });

  test("formats namespace/name", () => {
    expect(formatModuleRef({ namespace: "damatjs", name: "user" })).toBe(
      "damatjs/user",
    );
  });

  test("formats namespace/name@version", () => {
    expect(
      formatModuleRef({ namespace: "damatjs", name: "user", version: "0.2.0" }),
    ).toBe("damatjs/user@0.2.0");
  });

  test("formats name@version without namespace", () => {
    expect(formatModuleRef({ name: "user", version: "1.0.0" })).toBe(
      "user@1.0.0",
    );
  });

  test("round-trips with parseModuleRef", () => {
    const input = "damatjs/user@0.2.0";
    const parsed = parseModuleRef(input)!;
    expect(formatModuleRef(parsed)).toBe(input);
  });
});
