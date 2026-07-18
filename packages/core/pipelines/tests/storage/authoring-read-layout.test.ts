import { beforeEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  createPipelineAuthoringClient,
  type PipelineManifest,
} from "../../src";
import { ensureStorage, uniqueName } from "./context";

beforeEach(async () => {
  await ensureStorage();
  clearPipelineRuntime();
});

const manifest: PipelineManifest = {
  start: "wait",
  nodes: [{ id: "wait", kind: "delay", delayMs: 0 }],
  edges: [],
};
const mutation = (key: string) => ({
  actor: { id: "editor", type: "user" as const },
  reason: "layout coverage",
  idempotencyKey: key,
});

test("authoring lists definitions and versions and returns missing views", async () => {
  const client = createPipelineAuthoringClient();
  const name = uniqueName("authoring-read");
  const draft = await client.saveDraft(
    name,
    manifest,
    undefined,
    mutation("draft"),
  );
  const definitions = await client.listDefinitions();
  expect(definitions.find((item) => item.name === name)).toMatchObject({
    source: "web",
    hasDraft: true,
  });
  expect(await client.listVersions(name)).toEqual([]);
  expect(await client.getLayout(crypto.randomUUID())).toBeUndefined();
  const version = await client.publishDraft(name, draft.revision, mutation("pub"));
  expect((await client.listVersions(name))[0]).toEqual(version);
});

test("layout revisions are audited and latest layout is readable", async () => {
  const client = createPipelineAuthoringClient();
  const name = uniqueName("authoring-layout");
  const draft = await client.saveDraft(name, manifest, undefined, mutation("d"));
  const version = await client.publishDraft(name, draft.revision, mutation("p"));
  expect(await client.saveLayout(version.id, { x: 1 }, mutation("l1"))).toBe(1);
  expect(await client.saveLayout(version.id, { x: 2 }, mutation("l2"))).toBe(2);
  expect(await client.getLayout(version.id)).toMatchObject({
    revision: 2,
    layout: { x: 2 },
    reason: "layout coverage",
  });
  await expect(
    client.saveLayout(crypto.randomUUID(), {}, mutation("missing")),
  ).rejects.toThrow("was not found");
});
