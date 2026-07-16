import { expect, test } from "bun:test";
import { requireDeduplicatedRun } from "../../src/client/deduplication-result";
import { mapJobRun } from "../../src/repositories/map-run";
import { runRow } from "./mapper-fixtures";

test("missing deduplicated runs fail visibly", () => {
  const run = mapJobRun(runRow());
  expect(requireDeduplicatedRun(run, run.id)).toBe(run);
  expect(() => requireDeduplicatedRun(undefined, "missing-run")).toThrow(
    "Deduplicated job run missing-run was not found",
  );
});
