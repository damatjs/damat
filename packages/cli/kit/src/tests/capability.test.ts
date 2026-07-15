import { expect, test } from "bun:test";
import { runCapabilityTest } from "@damatjs/cli/testing";
import { kitCliCapability } from "../capability";

test("kit capability runs standalone", async () => {
  expect(kitCliCapability.commands.map((command) => command.name)).toEqual([
    "kit",
  ]);
  const run = await runCapabilityTest(kitCliCapability, ["--help"]);
  expect(run.output.join("\n")).toContain("kit");
});
