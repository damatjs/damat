import { describe, expect, it } from "bun:test";
import { COLORS } from "../colors";
import {
  colorOff,
  colorOn,
  useColorizerEnvironment,
} from "./colorizerFixture";

useColorizerEnvironment();

describe("Colorizer: context", () => {
  it("omits empty context and serializes populated context", () => {
    expect(colorOn().context({})).toBe("");
    expect(colorOff().context({})).toBe("");
    expect(colorOn().context({ a: 1 })).toBe(
      `${COLORS.dim}{"a":1}${COLORS.reset}`,
    );
    expect(colorOff().context({ a: 1, b: "x" })).toBe('{"a":1,"b":"x"}');
  });
});

describe("Colorizer: errorInfo", () => {
  it("renders a real stack once without a duplicate heading", () => {
    const output = colorOn().errorInfo({
      name: "TypeError",
      message: "bad",
      stack: "TypeError: bad\n    at foo",
    });
    expect(output).toBe(
      `\n${COLORS.dim}TypeError: bad\n    at foo${COLORS.reset}`,
    );
    expect(output.match(/TypeError: bad/g)).toHaveLength(1);
  });

  it("adds a missing heading and supports errors without stacks", () => {
    expect(
      colorOff().errorInfo({
        name: "Error",
        message: "oops",
        stack: "at foo",
      }),
    ).toBe("\nError: oops\nat foo");
    expect(
      colorOff().errorInfo({
        name: "Error",
        message: "oops",
        stack: undefined,
      }),
    ).toBe("\nError: oops");
  });
});

describe("Colorizer: prefix", () => {
  it("renders colored and plain prefixes", () => {
    expect(colorOn().prefix("api")).toBe(
      `${COLORS.magenta}[api]${COLORS.reset}`,
    );
    expect(colorOff().prefix("api")).toBe("[api]");
  });
});
