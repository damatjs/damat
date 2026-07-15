import { expect, test } from "bun:test";
import { runCapabilityTest } from "@damatjs/cli/testing";
import { damatCapability, damatCommands } from "../capabilities";

test("Damat composes the exact compatible command order", async () => {
  expect(damatCommands.map(({ name }) => name)).toEqual([
    "create",
    "clone",
    "dev",
    "start",
    "build",
    "codegen",
    "barrel",
    "module",
    "kit",
    "auth",
  ]);
  expect(damatCommands.find(({ name }) => name === "module")?.aliases).toEqual([
    "m",
  ]);
  expect(
    damatCommands
      .find(({ name }) => name === "codegen")
      ?.options?.some(({ name }) => name === "all"),
  ).toBe(true);
  const run = await runCapabilityTest(damatCapability, ["--help"]);
  for (const command of damatCommands) {
    expect(run.output.join("\n")).toContain(command.name);
  }
});
