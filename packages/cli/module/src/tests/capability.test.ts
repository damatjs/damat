import { expect, test } from "bun:test";
import { runCapabilityTest } from "@damatjs/cli/testing";
import { moduleCliCapability } from "../capability";

test("the module capability exposes normal provider-module commands", async () => {
  expect(moduleCliCapability.commands.map((command) => command.name)).toEqual([
    "module",
  ]);
  const moduleRun = await runCapabilityTest(moduleCliCapability, ["--help"]);
  expect(moduleRun.output.join("\n")).toContain("module");
});
