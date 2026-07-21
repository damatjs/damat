import { expect, test } from "bun:test";
import type { DurabilityExecutor } from "../../src";
import { applyRetentionOverride } from "../../src/retention/apply";
import { actor } from "../controls/context";

test("pipeline overrides update remaining runs", async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const executor = {
    query: async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params: params ?? [] });
      return { rows: [], rowCount: 0 };
    },
  } as DurabilityExecutor;
  await applyRetentionOverride(executor, {
    workKind: "pipeline",
    scope: "onboarding",
    retentionMs: 7 * 86_400_000,
    actor,
    reason: "standard retention",
  });
  await applyRetentionOverride(executor, {
    workKind: "pipeline",
    scope: "*",
    retentionMs: "forever",
    actor,
    reason: "legal hold",
  });
  expect(calls.map(({ params }) => params)).toEqual([
    ["onboarding", 7 * 86_400_000],
    ["*", null],
  ]);
  expect(
    calls.every(({ sql }) => sql.includes('"_damat_pipeline_runs"')),
  ).toBeTrue();
});
