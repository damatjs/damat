import { describe, expect, test } from "bun:test";
import { coerceOptions, coerceOptionValue } from "../utils/validate";

describe("coerceOptionValue", () => {
  test("coerces number, boolean, and string values", () => {
    expect(coerceOptionValue("3.14", "number")).toBe(3.14);
    expect(coerceOptionValue("true", "boolean")).toBe(true);
    expect(coerceOptionValue("", "boolean")).toBe(false);
    expect(coerceOptionValue(42, "string")).toBe("42");
  });

  test("uses string coercion for an absent type", () => {
    expect(coerceOptionValue("test", undefined)).toBe("test");
    expect(coerceOptionValue(42, undefined)).toBe("42");
  });

  test("retains nullish values", () => {
    expect(coerceOptionValue(null, "string")).toBeNull();
    expect(coerceOptionValue(undefined, "string")).toBeUndefined();
  });
});

describe("coerceOptions", () => {
  test("coerces every defined option", () => {
    const result = coerceOptions(
      { port: "3000", verbose: "true", name: "test" },
      [
        { name: "port", type: "number" },
        { name: "verbose", type: "boolean" },
        { name: "name", type: "string" },
      ],
    );
    expect(result).toEqual({ port: 3000, verbose: true, name: "test" });
  });

  test("returns options unchanged without definitions", () => {
    const options = { name: "test" };
    expect(coerceOptions(options, undefined)).toEqual(options);
  });
});
