import { afterEach, expect, test } from "bun:test";
import {
  clearPipelineWakeupPublisher,
  configurePipelineWakeupPublisher,
  PIPELINE_WAKEUP_CHANNEL,
  publishPipelineWakeup,
} from "../src";

afterEach(clearPipelineWakeupPublisher);

test("wakeup publisher emits scoped and global messages when configured", async () => {
  const calls: unknown[][] = [];
  configurePipelineWakeupPublisher({
    publish: async (...args) => calls.push(args),
  });
  await publishPipelineWakeup("orders");
  await publishPipelineWakeup();
  expect(calls).toEqual([
    [PIPELINE_WAKEUP_CHANNEL, '{"kind":"pipelines","scope":"orders"}'],
    [PIPELINE_WAKEUP_CHANNEL, '{"kind":"pipelines"}'],
  ]);
  clearPipelineWakeupPublisher();
  await publishPipelineWakeup("ignored");
  expect(calls).toHaveLength(2);
});
