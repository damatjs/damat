import { describe, expect, it } from "bun:test";
import { COLORS, LEVEL_STYLES } from "../colors";
import {
  colorOff,
  colorOn,
  useColorizerEnvironment,
} from "./colorizerFixture";

useColorizerEnvironment();

describe("Colorizer: levels", () => {
  it("renders a colored badge and label", () => {
    const style = LEVEL_STYLES.info;
    const badge = `${style.color}${style.badge}${COLORS.reset}`;
    const label = `${style.color}${style.label.padEnd(5)}${COLORS.reset}`;
    expect(colorOn().level("info")).toBe(`${badge} ${label}`);
  });

  it("pads labels without color and preserves long labels", () => {
    const colorizer = colorOff();
    expect(colorizer.level("info")).toBe(`${LEVEL_STYLES.info.badge} INFO `);
    expect(colorizer.level("debug")).toBe(`${LEVEL_STYLES.debug.badge} DEBUG`);
    expect(colorizer.level("waiting")).toBe(
      `${LEVEL_STYLES.waiting.badge} WAITING`,
    );
  });
});

describe("Colorizer: messages", () => {
  it("uses each status color", () => {
    const colorizer = colorOn();
    expect(colorizer.message("m", "error")).toBe(
      `${COLORS.red}m${COLORS.reset}`,
    );
    expect(colorizer.message("m", "fatal")).toBe(
      `${COLORS.red}m${COLORS.reset}`,
    );
    expect(colorizer.message("m", "warn")).toBe(
      `${COLORS.yellow}m${COLORS.reset}`,
    );
    expect(colorizer.message("m", "success")).toBe(
      `${COLORS.green}m${COLORS.reset}`,
    );
    expect(colorizer.message("m", "cached")).toBe(
      `${COLORS.cyan}m${COLORS.reset}`,
    );
    expect(colorizer.message("m", "skip")).toBe(
      `${COLORS.dim}m${COLORS.reset}`,
    );
  });

  it("leaves neutral and disabled messages plain", () => {
    const on = colorOn();
    for (const level of ["info", "debug", "progress", "waiting"] as const)
      expect(on.message("m", level)).toBe("m");
    expect(colorOff().message("m", "error")).toBe("m");
  });
});
