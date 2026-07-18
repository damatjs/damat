import { beforeEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  createPipelineAuthoringClient,
  type PipelineManifest,
} from "../../src";
import { ensureStorage, pool, uniqueName } from "./context";

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
  const draft = await client.saveDraft(source, manifest, undefined, mutation("d"));
  const version = await client.publishDraft(source, draft.revision, mutation("p"));
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
    client.cloneVersionToDraft(crypto.randomUUID(), target, undefined, mutation("m")),
  ).rejects.toThrow("was not found");
});

test("versions can be activated and scheduled triggers can be controlled", async () => {
  const client = createPipelineAuthoringClient();
  const name = uniqueName("activate");
  const withTrigger = {
    ...manifest,
    triggers: [{ id: "minute", kind: "interval" as const, everyMs: 60_000 }],
  };
  const first = await client.saveDraft(name, withTrigger, undefined, mutation("d1"));
  const v1 = await client.publishDraft(name, first.revision, mutation("p1"));
  const second = await client.saveDraft(name, withTrigger, undefined, mutation("d2"));
  const v2 = await client.publishDraft(name, second.revision, mutation("p2"));
  await client.activateVersion(name, v1.id, mutation("activate"));
  expect((await client.listVersions(name)).find((v) => v.id === v1.id)?.active).toBe(true);
  await client.setTriggerEnabled(v1.id, "minute", false, mutation("off"));
  const control = await pool.query(
    `SELECT "enabled" FROM "_damat_pipeline_trigger_controls" WHERE "version_id"=$1`,
    [v1.id],
  );
  expect(control.rows[0]?.enabled).toBe(false);
  await expect(
    client.activateVersion(name, crypto.randomUUID(), mutation("wrong-version")),
  ).rejects.toThrow("does not belong");
  await expect(
    client.activateVersion(uniqueName("missing"), v2.id, mutation("missing-owner")),
  ).rejects.toThrow("was not found");
});
