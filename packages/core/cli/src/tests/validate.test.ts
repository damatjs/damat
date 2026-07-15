import { describe, expect, test } from "bun:test";
import { MissingRequiredOptionError } from "../errors";
import type { CommandOption } from "../types";
import { applyDefaults, validateOptions } from "../utils/validate";

describe("validateOptions", () => {
  const required: CommandOption[] = [
    { name: "name", description: "Name", required: true },
  ];

  test("accepts provided and defaulted required options", () => {
    expect(() => validateOptions({ name: "test" }, required, "test")).not.toThrow();
    expect(() =>
      validateOptions(
        {},
        [{ ...required[0]!, default: "default" }],
        "test",
      ),
    ).not.toThrow();
  });

  test("rejects a missing required option", () => {
    expect(() => validateOptions({}, required, "test")).toThrow(
      MissingRequiredOptionError,
    );
  });

  test("accepts an absent definition list", () => {
    expect(() => validateOptions({}, undefined, "test")).not.toThrow();
  });
});

describe("applyDefaults", () => {
  test("applies missing defaults without replacing provided values", () => {
    const definitions: CommandOption[] = [
      { name: "output", default: "dist" },
      { name: "minify", default: false },
    ];
    expect(applyDefaults({}, definitions)).toEqual({
      output: "dist",
      minify: false,
    });
    expect(applyDefaults({ output: "build" }, definitions).output).toBe(
      "build",
    );
  });

  test("returns options unchanged without definitions", () => {
    const options = { name: "test" };
    expect(applyDefaults(options, undefined)).toEqual(options);
  });
});
