import { describe, test, expect } from "bun:test";
import { buildOptionFlag } from "../run/buildOption";
import { resolveCommandName } from "../run/resolveCommand";
import {
  extractPositionalArgs,
} from "../run/buildCommand";

describe("buildOptionFlag", () => {
  test("renders a long flag only when there is no alias", () => {
    expect(buildOptionFlag({ name: "output" })).toBe("--output");
  });

  test("renders 'short, long' when an alias is provided", () => {
    expect(buildOptionFlag({ name: "output", alias: "o" })).toBe(
      "-o, --output",
    );
  });

  test("treats an empty-string alias as falsy and uses the long flag only", () => {
    expect(buildOptionFlag({ name: "force", alias: "" })).toBe("--force");
  });

  test("string options get a <value> placeholder so cac consumes the next token", () => {
    expect(buildOptionFlag({ name: "name", type: "string" })).toBe(
      "--name <value>",
    );
    expect(buildOptionFlag({ name: "port", alias: "p", type: "number" })).toBe(
      "-p, --port <value>",
    );
  });

  test("boolean options stay bare flags (cac --no-x negation keeps working)", () => {
    expect(buildOptionFlag({ name: "install", type: "boolean" })).toBe(
      "--install",
    );
  });
});

describe("resolveCommandName", () => {
  test("returns null for an empty argument list", () => {
    expect(resolveCommandName([])).toBeNull();
  });

  test("returns the first argument when it is a bare word", () => {
    expect(resolveCommandName(["build", "--out", "dist"])).toBe("build");
  });

  test("returns null when the first argument is a flag", () => {
    expect(resolveCommandName(["--help"])).toBeNull();
    expect(resolveCommandName(["-h", "build"])).toBeNull();
  });

  test("returns null when the first element is an empty string", () => {
    expect(resolveCommandName([""])).toBeNull();
  });
});

describe("extractPositionalArgs", () => {
  test("keeps bare positional arguments", () => {
    expect(extractPositionalArgs(["build", "target", "other"])).toEqual([
      "build",
      "target",
      "other",
    ]);
  });

  test("skips a flag and the value immediately following it", () => {
    // The implementation skips the flag AND the next token (treated as its value).
    expect(extractPositionalArgs(["build", "--out", "dist"])).toEqual([
      "build",
    ]);
  });

  test("skips short flags and consumes their following value too", () => {
    expect(extractPositionalArgs(["-o", "dist", "keep"])).toEqual(["keep"]);
  });

  test("returns an empty array for an empty input", () => {
    expect(extractPositionalArgs([])).toEqual([]);
  });

  test("ignores empty-string entries", () => {
    expect(extractPositionalArgs(["", "a", ""])).toEqual(["a"]);
  });

  test("a trailing flag with no value consumes the (nonexistent) next token", () => {
    expect(extractPositionalArgs(["cmd", "--flag"])).toEqual(["cmd"]);
  });
});
