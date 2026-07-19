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
const mutation = (key: string) => ({
  actor: { id: "editor", type: "user" as const },
  reason: "lifecycle coverage",
  idempotencyKey: key,
});
const manifest: PipelineManifest = {
  start: "wait",
  nodes: [{ id: "wait", kind: "delay", delayMs: 0 }],
  edges: [],
};

test("published versions can be cloned and drafts can be deleted", async () => {
  const client = createPipelineAuthoringClient();
  const source = uniqueName("clone-source");
  const draft = await client.saveDraft(
    source,
    manifest,
    undefined,
    mutation("d"),
  );
  const version = await client.publishDraft(
    source,
    draft.revision,
    mutation("p"),
  );
  const target = uniqueName("clone-target");
  const clone = await client.cloneVersionToDraft(
    version.id,
    target,
    undefined,
    mutation("c"),
  );
  expect(clone.manifest).toEqual(manifest);
  await client.deleteDraft(target, clone.revision, mutation("delete"));
  expect(await client.getDraft(target)).toBeUndefined();
  await expect(
    client.deleteDraft(target, clone.revision, mutation("conflict")),
  ).rejects.toThrow("revision conflict");
  await expect(
    client.cloneVersionToDraft(
      crypto.randomUUID(),
      target,
      undefined,
      mutation("m"),
    ),
  ).rejects.toThrow("was not found");
});
