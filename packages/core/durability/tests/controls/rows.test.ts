import { expect, test } from "bun:test";
import { mapControl, mapMaintenance } from "../../src/controls/rows";

const actor = { id: "system", type: "system" as const };

test("row mapping preserves empty string values and omits only null", () => {
  const control = mapControl({
    work_kind: "job",
    scope: "default",
    paused: true,
    reason: "",
    actor,
    created_at: new Date(0),
    updated_at: new Date(0),
  });
  expect(control.reason).toBe("");
  const maintenance = mapMaintenance({
    id: "1",
    operation: "retention",
    work_kind: "event",
    scope: "",
    status: "requested",
    actor,
    details: {},
    created_at: new Date(0),
    completed_at: null,
  });
  expect(maintenance.scope).toBe("");
});
