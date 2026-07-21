import { expect, test } from "bun:test";
import type { RuntimeConfig } from "../../config/types/runtime";
import { resolveRuntime } from "../../runtime/resolve";

test("selects the pipeline router and internal worker", () => {
  expect(resolveRuntime({ services: { pipelines: {} } }, {})).toEqual({
    mode: "all",
    workers: ["pipelines"],
    servesHttp: true,
  });
});

test("rejects unknown runtime values imported from config", () => {
  const unknownMode = { mode: "api" } as unknown as RuntimeConfig;
  const unknownWorker = { workers: ["unknown"] } as unknown as RuntimeConfig;
  expect(() => resolveRuntime({ runtime: unknownMode }, {})).toThrow(
    'Unknown runtime mode "api"',
  );
  expect(() => resolveRuntime({ runtime: unknownWorker }, {})).toThrow(
    'Unknown worker capability "unknown"',
  );
});
