import { describe, it, expect } from "bun:test";
import { deriveNames } from "../scaffold/naming";
import {
  stepUpdate,
  stepCreate,
  stepDelete,
  stepFind,
} from "../scaffold/templates/step";

// Saga steps must be reversible: when a LATER step in the workflow fails, the
// compensation has to put the data back. The engine delivers ONLY the
// `compensateInput` carried in the step's StepResponse — so the forward step has
// to capture whatever rollback needs (the update step, in particular, must
// snapshot the Previous row, since the post-update output can't describe it). These
// tests lock that contract into the generated templates.
const n = deriveNames("shop", {
  name: "widgets",
  columns: [
    { name: "id", type: "uuid", nullable: false, primaryKey: true },
    { name: "name", type: "text", nullable: false },
  ],
});

describe("stepUpdate — reversion", () => {
  const step = stepUpdate(n, "@shop/types");

  it("snapshots the previous row and returns it as the StepResponse compensateInput", () => {
    // The read must happen so compensation has the previous state to restore.
    expect(step).toContain(".find({ where: { id: input.id } })");
    // output = the updated row; compensateInput = the previous row.
    expect(step).toContain("return new StepResponse(row, previous)");
    // No side channels: the previous row rides on the StepResponse, not ctx.metadata
    // or a module-level cache.
    expect(step).not.toContain("ctx.metadata");
    expect(step).not.toContain("WeakMap");
  });

  it("restores the previous row in the compensation, not an empty stub", () => {
    // Regression: the old template shipped a no-op compensation that silently
    // dropped the update on rollback.
    expect(step).not.toContain("async (_input, _updated, _ctx) => {}");
    // Compensation takes the previous row (the StepResponse payload) directly...
    expect(step).toContain("async (previous, _ctx) =>");
    // ...locates the row by the previous row's own key and writes the values back
    // (spread to satisfy the CRUD `data` contract, mirroring delete's recreate).
    expect(step).toContain("where: { id: previous.id }");
    expect(step).toContain("data: { ...previous }");
  });
});

// Guard the sibling steps' reversion so a future refactor can't quietly strip it.
describe("stepCreate / stepDelete / stepFind — StepResponse shape", () => {
  it("create returns (created, created) and reverses by deleting the created row", () => {
    const step = stepCreate(n, "@shop/types");
    expect(step).toContain("return new StepResponse(created, created)");
    expect(step).toContain("async (created, _ctx) =>");
    expect(step).toContain(".delete({ where: { id: created.id } })");
  });

  it("delete returns (true, existing) and reverses by recreating the row", () => {
    const step = stepDelete(n, "@shop/types");
    expect(step).toContain("return new StepResponse(true, existing)");
    expect(step).toContain("async (deleted, _ctx) =>");
    expect(step).toContain("data: { ...deleted }");
  });

  it("read-only find wraps its output with no compensation payload", () => {
    const step = stepFind(n, "@shop/types");
    expect(step).toContain("return new StepResponse(row)");
    // No compensation function for a read.
    expect(step).toContain("undefined,");
  });
});
