import { expect, test } from "bun:test";
import { emitDurableInvalidation } from "@damatjs/durability";
import {
  createPipelineInspectionClient,
  subscribePipelineInvalidations,
} from "../src";
import { resolvePipelineInspectionOptions } from "../src/inspection/config";

test("inspection configuration requires a valid signing key and applies defaults", () => {
  expect(() => resolvePipelineInspectionOptions(undefined as never)).toThrow(
    "cursorSigningKey",
  );
  expect(() =>
    resolvePipelineInspectionOptions({ cursorSigningKey: "short" }),
  ).toThrow();
  const client = {} as never;
  const resolved = resolvePipelineInspectionOptions({
    cursorSigningKey: "a-valid-inspection-signing-key-32",
    client,
  });
  expect(resolved).toMatchObject({
    visibility: "metadata",
    redaction: {},
    client,
  });
  expect(createPipelineInspectionClient({
    cursorSigningKey: "a-valid-inspection-signing-key-32",
    client,
  })).toMatchObject({
    listRuns: expect.any(Function),
    getRun: expect.any(Function),
    getSummary: expect.any(Function),
    pause: expect.any(Function),
    resume: expect.any(Function),
    cancel: expect.any(Function),
    retryNode: expect.any(Function),
    runRetention: expect.any(Function),
  });
});

test("pipeline invalidation subscriptions filter unrelated resources", () => {
  const seen: unknown[] = [];
  const unsubscribe = subscribePipelineInvalidations((event) => seen.push(event));
  emitDurableInvalidation({ kind: "job", revision: "1" });
  emitDurableInvalidation({ kind: "pipeline", id: "run", revision: "2" });
  unsubscribe();
  emitDurableInvalidation({ kind: "pipeline", id: "late", revision: "3" });
  expect(seen).toEqual([{ kind: "pipeline", id: "run", revision: "2" }]);
});
