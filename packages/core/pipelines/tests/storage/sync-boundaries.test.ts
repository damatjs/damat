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

const graph = (delayMs = 0) => ({
  version: 1,
  start: "start",
  edges: [],
  nodes: [{ id: "start", kind: "delay" as const, delayMs }],
});
const mutation = {
  actor: { id: "editor", type: "user" as const },
  reason: "ownership",
  idempotencyKey: "create",
};

test("definition sync rejects unpublished child pipelines", async () => {
  definePipeline(uniqueName("parent"), {
    version: 1,
    start: "child",
    edges: [
      { from: "child", to: "each" },
      { from: "each", to: "loop" },
    ],
    nodes: [
      { id: "child", kind: "child", pipeline: uniqueName("missing") },
      {
        id: "each",
        kind: "foreach",
        pipeline: uniqueName("missing-each"),
        items: [],
        maxItems: 1,
      },
      {
        id: "loop",
        kind: "loop",
        pipeline: uniqueName("missing-loop"),
        until: { op: "eq", left: 1, right: 1 },
        maxIterations: 1,
      },
    ],
  });
  await expect(syncPipelineDefinitions()).rejects.toThrow("unpublished child");
});

test("code versions are immutable once a checksum has been stored", async () => {
  const name = uniqueName("checksum");
  definePipeline(name, graph(0));
  await syncPipelineDefinitions();
  clearPipelineRuntime();
  definePipeline(name, graph(1));
  await expect(syncPipelineDefinitions()).rejects.toThrow("changed checksum");
});

test("code sync cannot take ownership of a web-authored definition", async () => {
  const name = uniqueName("web-owned");
  const client = createPipelineAuthoringClient({ client: durability });
  await client.saveDraft(name, graph(), undefined, mutation);
  definePipeline(name, graph());
  await expect(syncPipelineDefinitions()).rejects.toThrow("web-owned");
});
