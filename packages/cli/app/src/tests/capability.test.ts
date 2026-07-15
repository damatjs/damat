import { expect, test } from "bun:test";
import { runCapabilityTest } from "@damatjs/cli/testing";
import { appCliCapability } from "../capability";

test("app capability runs standalone with lifecycle command help", async () => {
  const run = await runCapabilityTest(appCliCapability, ["--help"]);
  const help = run.output.join("\n");

  expect(appCliCapability.commands.map((command) => command.name)).toEqual([
    "create",
    "clone",
    "dev",
    "start",
    "build",
  ]);
  for (const name of ["create", "clone", "dev", "start", "build"]) {
    expect(help).toContain(name);
  }
});
