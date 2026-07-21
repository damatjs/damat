import { beforeEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  createPipelineAuthoringClient,
  type PipelineManifest,
} from "../../src";
import { durability, ensureStorage, uniqueName } from "./context";

beforeEach(async () => {
  await ensureStorage();
  clearPipelineRuntime();
});

const manifest: PipelineManifest = {
  start: "wait",
  nodes: [{ id: "wait", kind: "delay", delayMs: 0 }],
  edges: [],
  output: { $ref: "nodes.wait.output" },
};
const mutation = (key: string) => ({
  actor: { id: "editor", type: "user" as const },
  reason: "visual editor test",
  idempotencyKey: key,
});

test("draft revisions distinguish create from update", async () => {
  const client = createPipelineAuthoringClient({ client: durability });
  const name = uniqueName("web-draft");
  expect(
    (await client.saveDraft(name, manifest, undefined, mutation("create")))
      .revision,
  ).toBe(1);
  await expect(
    client.saveDraft(name, manifest, undefined, mutation("stale")),
  ).rejects.toThrow("revision conflict");
  expect(
    (await client.saveDraft(name, manifest, 1, mutation("update"))).revision,
  ).toBe(2);
  await expect(
    client.saveDraft(uniqueName("new"), manifest, 1, mutation("bad-create")),
  ).rejects.toThrow("revision conflict");
});

test("published version replay succeeds after its draft is deleted", async () => {
  const client = createPipelineAuthoringClient({ client: durability });
  const name = uniqueName("web-publish");
  await client.saveDraft(name, manifest, undefined, mutation("draft"));
  const published = await client.publishDraft(name, 1, mutation("publish"));
  const replay = await client.publishDraft(name, 1, mutation("publish"));
  expect(replay.id).toBe(published.id);
  expect(replay.active).toBe(true);
  expect(await client.getDraft(name)).toBeUndefined();
});
