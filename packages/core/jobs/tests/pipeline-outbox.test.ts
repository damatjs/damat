import { afterEach, expect, test } from "bun:test";
import {
  clearAccelerationController,
  configureAccelerationController,
  createTransactionalExecutor,
  invalidateTransactionalExecutor,
  runAfterCommitCallbacks,
  type DurabilityQueryResult,
} from "@damatjs/durability";
import { recordPipelineMetadataTerminal } from "../src/terminal/signal";

afterEach(clearAccelerationController);

test("records the pipeline wake-up in the terminal job transaction", async () => {
  const queries: Array<{ sql: string; params?: readonly unknown[] }> = [];
  let flushes = 0;
  configureAccelerationController({
    rebuild: async () => {},
    flush: async () => {
      flushes += 1;
    },
  });
  const executor = createTransactionalExecutor({
    query: async (sql, params) => {
      queries.push({ sql, ...(params ? { params } : {}) });
      return { rows: [], rowCount: 1 } as DurabilityQueryResult;
    },
  });
  await recordPipelineMetadataTerminal(executor, {
    _damatPipeline: {
      runId: "run-1",
      nodeExecutionId: "node-1",
      pipeline: "onboarding",
    },
  });
  expect(queries).toHaveLength(1);
  expect(queries[0]!.sql).toContain('"_damat_acceleration_outbox"');
  expect(queries[0]!.params?.slice(1, 5)).toEqual([
    "damat:pipelines:wakeup",
    "pipeline",
    "run-1",
    "onboarding",
  ]);
  expect(flushes).toBe(0);
  invalidateTransactionalExecutor(executor);
  await runAfterCommitCallbacks(executor);
  expect(flushes).toBe(1);
});

test("ignores terminal jobs without a complete pipeline binding", async () => {
  let queries = 0;
  const executor = createTransactionalExecutor({
    query: async () => {
      queries += 1;
      return { rows: [], rowCount: 1 };
    },
  });
  await recordPipelineMetadataTerminal(executor, {
    _damatPipeline: { runId: "run-1" },
  });
  expect(queries).toBe(0);
});
