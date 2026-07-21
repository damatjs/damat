import { expect, test } from "bun:test";
import { signalPipelineRun } from "../../src";

const actor = { id: "caller", type: "user" as const };

test("signal calls validate all required audit fields", async () => {
  for (const [runId, name, key, reason] of [
    ["", "go", "key", "reason"],
    ["run", "", "key", "reason"],
    ["run", "go", "", "reason"],
    ["run", "go", "key", ""],
  ]) {
    await expect(
      signalPipelineRun(
        runId,
        name,
        {},
        { actor, idempotencyKey: key, reason },
      ),
    ).rejects.toThrow("required");
  }
});
