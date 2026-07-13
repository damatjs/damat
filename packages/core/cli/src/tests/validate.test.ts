import { describe, test, expect } from "bun:test";
import {
  validateOptions,
  applyDefaults,
  coerceOptions,
  coerceOptionValue,
} from "../utils/validate";
import type { CommandOption } from "../types";
import { MissingRequiredOptionError } from "../errors";

describe("validateOptions", () => {
  test("should pass when all required options are provided", () => {
    const options = { name: "test" };
    const optionDefs: CommandOption[] = [
      { name: "name", description: "Name", required: true },
    ];

    try {
      validateOptions(options, optionDefs, "test");
      expect(true).toBe(true);
    } catch {
      expect(true).toBe(false);
    }
  });

  test("should throw when required option is missing", () => {
    const options = {};
    const optionDefs: CommandOption[] = [
      { name: "name", description: "Name", required: true },
    ];

    expect(() => validateOptions(options, optionDefs, "test")).toThrow(
      MissingRequiredOptionError,
    );
  });

  test("should pass when required option has default value", () => {
    const options = {};
    const optionDefs: CommandOption[] = [
      { name: "name", description: "Name", required: true, default: "default" },
    ];

    try {
      validateOptions(options, optionDefs, "test");
      expect(true).toBe(true);
    } catch {
      expect(true).toBe(false);
    }
  });

  test("should pass when no option definitions", () => {
    const options = { name: "test" };
    try {
      validateOptions(options, undefined, "test");
      expect(true).toBe(true);
    } catch {
      expect(true).toBe(false);
    }
  });
});

describe("applyDefaults", () => {
  test("should apply default values to missing options", () => {
    const options = {};
    const optionDefs: CommandOption[] = [
      { name: "output", description: "Output", default: "dist" },
      { name: "minify", description: "Minify", default: false },
    ];

    const result = applyDefaults(options, optionDefs);

    expect(result.output).toBe("dist");
    expect(result.minify).toBe(false);
  });

  test("should not override provided values", () => {
    const options = { output: "build" };
    const optionDefs: CommandOption[] = [
      { name: "output", description: "Output", default: "dist" },
    ];

    const result = applyDefaults(options, optionDefs);

    expect(result.output).toBe("build");
  });

  test("should return options as-is when no definitions", () => {
    const options = { name: "test" };
    const result = applyDefaults(options, undefined);
    expect(result).toEqual(options);
  });
});

describe("coerceOptionValue", () => {
  test("should coerce to number", () => {
    expect(coerceOptionValue("42", "number")).toBe(42);
    expect(coerceOptionValue("3.14", "number")).toBe(3.14);
  });

  test("should coerce to boolean", () => {
    expect(coerceOptionValue("true", "boolean")).toBe(true);
    expect(coerceOptionValue("", "boolean")).toBe(false);
    expect(coerceOptionValue(1, "boolean")).toBe(true);
  });

  test("should coerce to string", () => {
    expect(coerceOptionValue(42, "string")).toBe("42");
    expect(coerceOptionValue(true, "string")).toBe("true");
  });

  test("should return value as-is for undefined type", () => {
    expect(coerceOptionValue("test", undefined)).toBe("test");
    expect(coerceOptionValue(42, undefined)).toBe("42");
  });

  test("should handle null and undefined", () => {
    expect(coerceOptionValue(null, "string")).toBeNull();
    expect(coerceOptionValue(undefined, "string")).toBeUndefined();
  });
});

describe("coerceOptions", () => {
  test("should coerce all options based on definitions", () => {
    const options = {
      port: "3000",
      verbose: "true",
      name: "test",
    };
    const optionDefs: CommandOption[] = [
      { name: "port", description: "Port", type: "number" },
      { name: "verbose", description: "Verbose", type: "boolean" },
      { name: "name", description: "Name", type: "string" },
    ];

    const result = coerceOptions(options, optionDefs);

    expect(result.port).toBe(3000);
    expect(result.verbose).toBe(true);
    expect(result.name).toBe("test");
  });

  test("should return options as-is when no definitions", () => {
    const options = { name: "test" };
    const result = coerceOptions(options, undefined);
    expect(result).toEqual(options);
  });
});
