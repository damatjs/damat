import { expect, test } from "bun:test";
import { applyInspectionVisibility } from "../../src";

test("inspection visibility consistently hides payload and metadata", () => {
  const value = { payload: { secret: true }, metadata: { traceId: "trace-1" } };
  expect(applyInspectionVisibility(value, "full")).toEqual(value);
  expect(applyInspectionVisibility(value, "metadata")).toEqual({
    metadata: value.metadata,
  });
  expect(applyInspectionVisibility(value, "hidden")).toEqual({});
  expect(value.payload.secret).toBe(true);
});
