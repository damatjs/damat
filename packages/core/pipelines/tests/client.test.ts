import { expect, test } from "bun:test";
import { startPipeline } from "../src";

test("child lineage identifiers must be supplied as one pair", async () => {
  await expect(
    startPipeline("child", {}, { parentRunId: crypto.randomUUID() }),
  ).rejects.toThrow(
    "parentRunId and parentNodeExecutionId must be supplied together",
  );
  await expect(
    startPipeline(
      "child",
      {},
      {
        parentNodeExecutionId: crypto.randomUUID(),
      },
    ),
  ).rejects.toThrow(
    "parentRunId and parentNodeExecutionId must be supplied together",
  );
});
