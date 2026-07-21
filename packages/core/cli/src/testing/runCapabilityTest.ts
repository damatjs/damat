import { runCli } from "../run";
import type { CliCapability } from "../types";
import { createCapabilityTestRuntime } from "./createCapabilityTestRuntime";
import type { CapabilityTestRun } from "./types";

export async function runCapabilityTest(
  capability: CliCapability,
  args: readonly string[] = [],
): Promise<CapabilityTestRun> {
  const fixture = createCapabilityTestRuntime(args);
  const result = await runCli(
    {
      name: `${capability.name}-test`,
      version: "0.0.0-test",
      commands: [...capability.commands],
    },
    fixture.runtime,
  );
  return { ...fixture, result };
}
