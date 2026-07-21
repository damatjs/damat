import { beforeEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  createPipelineAuthoringClient,
  definePipeline,
  syncPipelineDefinitions,
} from "../../src";
import { durability, ensureStorage, uniqueName } from "./context";

beforeEach(async () => {
  await ensureStorage();
  clearPipelineRuntime();
});
const mutation = (key: string, reason = "validation coverage") => ({
  actor: { id: "editor", type: "user" as const },
  reason,
  idempotencyKey: key,
});

test("web validation reports malformed graphs and unpublished children", async () => {
  const client = createPipelineAuthoringClient({ client: durability });
  const invalid = await client.validate({
    start: "none",
    nodes: [],
    edges: [],
  });
  expect(invalid.valid).toBe(false);
  expect(invalid.errors[0]).toContain("at least one node");
  const child = uniqueName("unknown-child");
  const result = await client.validate({
    start: "child",
    nodes: [
      { id: "child", kind: "child", pipeline: child },
      { id: "each", kind: "foreach", pipeline: child, items: [], maxItems: 1 },
    ],
    edges: [{ from: "child", to: "each" }],
  });
  expect(result.errors).toEqual([
    `Unknown published child pipeline "${child}"`,
  ]);
});

test("code-owned names cannot be overwritten by the visual authoring client", async () => {
  const name = uniqueName("code-owned");
  definePipeline(name, {
    version: 1,
    start: "only",
    nodes: [{ id: "only", kind: "delay", delayMs: 0 }],
    edges: [],
  });
  await syncPipelineDefinitions();
  const client = createPipelineAuthoringClient();
  await expect(
    client.saveDraft(
      name,
      {
        start: "only",
        nodes: [{ id: "only", kind: "delay", delayMs: 0 }],
        edges: [],
      },
      undefined,
      mutation("save"),
    ),
  ).rejects.toThrow("code-owned");
  expect(client.listCapabilities()).toEqual({
    actions: [],
    workflows: [],
    jobs: [],
    events: [],
  });
});

test("mutations require an actor, name, reason, and idempotency key", async () => {
  const client = createPipelineAuthoringClient();
  const manifest = {
    start: "x",
    nodes: [{ id: "x", kind: "delay" as const, delayMs: 0 }],
    edges: [],
  };
  await expect(
    client.saveDraft("", manifest, undefined, mutation("key")),
  ).rejects.toThrow("required");
  await expect(
    client.saveDraft("name", manifest, undefined, mutation("key", "")),
  ).rejects.toThrow("required");
  await expect(
    client.saveDraft("name", manifest, undefined, mutation("")),
  ).rejects.toThrow("required");
});
