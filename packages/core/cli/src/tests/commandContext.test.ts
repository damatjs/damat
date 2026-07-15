import { expect, test } from "bun:test";
import { buildCommandContext } from "../run/buildCommand";
import type { CliLogger } from "../types";

const logger: CliLogger = {
  debug() {},
  info() {},
  success() {},
  skip() {},
  warn() {},
  error() {},
};

test("command context uses only explicit invocation values", () => {
  const options = { out: "dist" };
  const context = buildCommandContext(
    "build",
    ["target", "--out", "dist"],
    options,
    { cwd: "/workspace", logger },
  );

  expect(context).toEqual({
    command: "build",
    args: ["target"],
    options,
    logger,
    cwd: "/workspace",
  });
});
