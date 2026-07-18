import { afterAll, beforeAll, expect, test } from "bun:test";
import {
  clearDurabilityClient,
  getRetentionOverride,
  setDurabilityClient,
  setRetentionOverride,
  type DurabilityExecutor,
} from "../../src";
import { applyRetentionOverride } from "../../src/retention/apply";
import { createRepositoryContext, testId } from "../repositoryContext";
import { actor } from "../controls/context";

let context: Awaited<ReturnType<typeof createRepositoryContext>>;
beforeAll(async () => {
  context = await createRepositoryContext();
  setDurabilityClient(context.durability);
});
afterAll(async () => {
  clearDurabilityClient();
  await context.pool.end();
});

test("retention overrides persist finite and forever values", async () => {
  const scope = testId("retention");
  expect(await setRetentionOverride({
    workKind: "job",
    scope,
    retentionMs: 7 * 86_400_000,
    actor,
    reason: "shorten history",
  })).toMatchObject({ retentionMs: 7 * 86_400_000 });
  expect(await setRetentionOverride({
    workKind: "job",
    scope,
    retentionMs: "forever",
    actor,
    reason: "legal hold",
  })).toMatchObject({ retentionMs: "forever" });
  expect(await getRetentionOverride("job", scope)).toMatchObject({
    retentionMs: "forever",
    reason: "legal hold",
  });
  expect(await getRetentionOverride("job", testId("missing"))).toBeUndefined();
});

test("event overrides update remaining outbox and delivery rows", async () => {
  const queries: unknown[][] = [];
  const executor = {
    query: async (_sql: string, params?: unknown[]) => {
      queries.push(params ?? []);
      return { rows: [], rowCount: 0 };
    },
  } as DurabilityExecutor;
  await applyRetentionOverride(executor, {
    workKind: "event",
    scope: "*",
    retentionMs: "forever",
    actor,
    reason: "audit",
  });
  expect(queries).toEqual([["*", null], ["*"]]);
});

test("retention overrides reject invalid scope, reason, and duration", async () => {
  await expect(setRetentionOverride({
    workKind: "job", scope: " ", retentionMs: 1, actor, reason: "audit",
  })).rejects.toThrow("scope and reason");
  await expect(setRetentionOverride({
    workKind: "job", scope: "queue", retentionMs: 1, actor, reason: " ",
  })).rejects.toThrow("scope and reason");
  await expect(setRetentionOverride({
    workKind: "job", scope: "queue", retentionMs: -1, actor, reason: "audit",
  })).rejects.toThrow("non-negative safe integer");
});
