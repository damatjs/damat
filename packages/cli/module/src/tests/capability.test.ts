import { expect, test } from "bun:test";
import { runCapabilityTest } from "@damatjs/cli/testing";
import { authCliCapability, moduleCliCapability } from "../capability";

test("module and auth capabilities run independently", async () => {
  expect(moduleCliCapability.commands.map((command) => command.name)).toEqual([
    "module",
  ]);
  expect(authCliCapability.commands.map((command) => command.name)).toEqual([
    "auth",
  ]);
  const moduleRun = await runCapabilityTest(moduleCliCapability, ["--help"]);
  const authRun = await runCapabilityTest(authCliCapability, ["--help"]);
  expect(moduleRun.output.join("\n")).toContain("module");
  expect(authRun.output.join("\n")).toContain("auth");
});
