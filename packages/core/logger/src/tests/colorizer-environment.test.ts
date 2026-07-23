import { describe, expect, it } from "bun:test";
import { Colorizer } from "../colorizer";
import { COLORS } from "../colors";
import {
  colorOff,
  colorOn,
  useColorizerEnvironment,
} from "./colorizerFixture";

useColorizerEnvironment();

describe("Colorizer: enable detection", () => {
  it("FORCE_COLOR enables colors", () => {
    process.env.FORCE_COLOR = "1";
    expect(new Colorizer(true).colorize("x", COLORS.red)).toBe(
      `${COLORS.red}x${COLORS.reset}`,
    );
  });

  it("environment and explicit disabling take precedence", () => {
    process.env.NO_COLOR = "1";
    process.env.FORCE_COLOR = "1";
    expect(new Colorizer(true).colorize("x", COLORS.red)).toBe("x");
    delete process.env.NO_COLOR;
    delete process.env.FORCE_COLOR;
    process.env.TERM = "dumb";
    expect(new Colorizer(true).colorize("x", COLORS.red)).toBe("x");
    expect(new Colorizer(false).colorize("x", COLORS.red)).toBe("x");
  });
});

describe("Colorizer: basic styles", () => {
  it("wraps enabled styles and leaves disabled styles plain", () => {
    const on = colorOn();
    expect(on.colorize("hello", COLORS.green)).toBe(
      `${COLORS.green}hello${COLORS.reset}`,
    );
    expect(on.bold("b")).toBe(`${COLORS.bold}b${COLORS.reset}`);
    expect(on.dim("d")).toBe(`${COLORS.dim}d${COLORS.reset}`);
    const off = colorOff();
    expect(off.colorize("hello", COLORS.green)).toBe("hello");
    expect(off.bold("b")).toBe("b");
    expect(off.dim("d")).toBe("d");
  });

  it("styles timestamps only when enabled", () => {
    expect(colorOn().timestamp("2020-01-01")).toBe(
      `${COLORS.dim}2020-01-01${COLORS.reset}`,
    );
    expect(colorOff().timestamp("2020-01-01")).toBe("2020-01-01");
  });
});
