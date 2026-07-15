import { describe, expect, spyOn, test } from "bun:test";
import { CliError } from "../errors";
import { getExitCode, reportError } from "../utils/output";
import { createRuntimeFixture } from "./runtimeFixture";

describe("reportError", () => {
  test("non-verbose output has a headline, causes, and hint", () => {
    const fixture = createRuntimeFixture();
    const root = new Error("root");
    const error = new Error("boom", { cause: root });
    reportError(fixture.runtime.logger, fixture.runtime.output, error, {
      prefix: "Command failed",
      verbose: false,
    });
    expect(fixture.errors).toEqual([
      "Command failed: boom",
      "↳ caused by: root",
    ]);
    expect(fixture.messages.join("\n")).toContain("--verbose");
  });

  test("verbose output forwards errors and omits the hint", () => {
    const fixture = createRuntimeFixture();
    const errorSpy = spyOn(fixture.runtime.logger, "error");
    const error = new Error("boom");
    reportError(fixture.runtime.logger, fixture.runtime.output, error, {
      verbose: true,
    });
    expect(errorSpy.mock.calls[0]?.[1]).toBe(error);
    expect(fixture.messages).toEqual([]);
  });

  test("normalizes meaningful names and non-Error values", () => {
    const fixture = createRuntimeFixture();
    const named = new Error("bad");
    named.name = "ConfigError";
    reportError(fixture.runtime.logger, fixture.runtime.output, named, {
      verbose: false,
    });
    reportError(fixture.runtime.logger, fixture.runtime.output, "plain", {
      verbose: false,
    });
    expect(fixture.errors).toContain("ConfigError: bad");
    expect(fixture.errors).toContain("plain");
  });
});

describe("getExitCode", () => {
  test("uses CliError codes and defaults all other values to one", () => {
    expect(getExitCode(new CliError("x", 2))).toBe(2);
    expect(getExitCode(new Error("x"))).toBe(1);
    expect(getExitCode("x")).toBe(1);
  });
});
