import { expect, test } from "bun:test";
import type { DurabilityExecutor } from "@damatjs/durability";
import type { Redis } from "@damatjs/redis";
import { auditAccelerationRebuild } from "../../services/initialize/accelerationAudit";
import { rebuildReadyProjection } from "../../services/initialize/accelerationProjection";

test("projection rebuild replaces every durable ready index", async () => {
  const now = new Date(1_000);
  const executor = {
    query: async (sql: string) => {
      if (sql.includes("_damat_job_runs"))
        return rows([{ id: "job", scope: "q", available_at: now }]);
      if (sql.includes("routed_at"))
        return rows([{ id: "event", scope: "router", available_at: now }]);
      if (sql.includes("_damat_pipeline_node_executions")) {
        return rows([{ id: "pipeline", scope: "onboard", available_at: now }]);
      }
      return rows([
        { id: "delivery", scope: '["mail","audit"]', available_at: now },
      ]);
    },
  } as DurabilityExecutor;
  const ready: unknown[][] = [];
  const deleted: string[][] = [];
  let scans = 0;
  const redis = {
    scan: async () =>
      ++scans === 1
        ? ["1", ["damat:ready:old:1"]]
        : ["0", ["damat:ready:old:2"]],
    del: async (...keys: string[]) => void deleted.push(keys),
    zadd: async (...args: unknown[]) => void ready.push(args),
  } as unknown as Redis;
  await rebuildReadyProjection(
    redis,
    { jobs: true, events: true, pipelines: true },
    executor,
  );
  expect(deleted).toEqual([["damat:ready:old:1", "damat:ready:old:2"]]);
  expect(ready).toEqual([
    ["damat:ready:jobs:q", 1_000, "job"],
    ["damat:ready:events:router", 1_000, "event"],
    ['damat:ready:events:delivery:["mail","audit"]', 1_000, "delivery"],
    ["damat:ready:pipelines:router", 1_000, "pipeline"],
  ]);
});

test("projection audit writes actor, status, and details", async () => {
  const queries: Array<{ sql: string; params?: unknown[] }> = [];
  const executor = {
    query: async (sql: string, params?: unknown[]) => {
      queries.push({ sql, params });
      return { rows: [], rowCount: 1 };
    },
  } as DurabilityExecutor;
  const actor = { id: "operator", type: "user" as const, reason: "repair" };
  await auditAccelerationRebuild(actor, "requested", {}, executor);
  await auditAccelerationRebuild(
    actor,
    "failed",
    { error: "offline" },
    executor,
  );
  expect(queries.map(({ params }) => params?.[0])).toEqual([
    "requested",
    "failed",
  ]);
  expect(queries[1]?.params?.[2]).toBe('{"error":"offline"}');
});

function rows(value: unknown[]) {
  return { rows: value, rowCount: value.length };
}
