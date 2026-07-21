import { describe, test, expect } from "bun:test";
import { parseCommandArgs } from "../run/buildCommand";
import type { CommandOption } from "../types";

const defs: CommandOption[] = [
  {
    name: "typecheck",
    description: "Type-check",
    type: "boolean",
    default: true,
  },
  { name: "minify", description: "Minify", type: "boolean", default: false },
  { name: "output", alias: "o", description: "Output", type: "string" },
  { name: "port", description: "Port", type: "number" },
];

describe("parseCommandArgs", () => {
  test("applies boolean and string/number option defaults", () => {
    const { options } = parseCommandArgs([], defs);
    expect(options.typecheck).toBe(true);
    expect(options.minify).toBe(false);
  });

  test("--no-<name> negates a boolean option (down to false)", () => {
    const { options } = parseCommandArgs(["--no-typecheck"], defs);
    expect(options.typecheck).toBe(false);
  });

  test("a bare boolean flag sets it true", () => {
    const { options } = parseCommandArgs(["--minify"], defs);
    expect(options.minify).toBe(true);
  });

  test("parses --name value, --name=value, alias, number, and positionals", () => {
    const { options, positional } = parseCommandArgs(
      ["build", "--output", "out", "--port=8080", "extra"],
      defs,
    );
    expect(options.output).toBe("out");
    expect(options.port).toBe(8080);
    expect(positional).toEqual(["build", "extra"]);
  });

  test("--no-<name> for an unknown option is ignored, leaving the default", () => {
    const { options } = parseCommandArgs(["--no-unknown"], defs);
    expect(options.typecheck).toBe(true);
    expect("unknown" in options).toBe(false);
  });
});
