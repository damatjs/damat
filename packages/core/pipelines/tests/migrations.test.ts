import { expect, test } from "bun:test";
import { pipelinesSystemMigrations } from "../src/migrations";

test("declares ordered pipeline storage with explicit names", () => {
  const catalog = pipelinesSystemMigrations;
  expect(catalog.owner).toBe("@damatjs/pipelines");
  expect(catalog.migrations.map(({ id, order }) => [id, order])).toEqual([
    ["001", 1000],
  ]);
  const sql = catalog.migrations[0]!.sql;
  for (const table of [
    "_damat_pipeline_definitions",
    "_damat_pipeline_versions",
    "_damat_pipeline_runs",
    "_damat_pipeline_node_executions",
    "_damat_pipeline_transitions",
    "_damat_pipeline_signals",
    "_damat_pipeline_activity",
  ]) {
    expect(sql).toContain(`"${table}"`);
  }
  expect(sql).not.toMatch(/CONSTRAINT\s+(?!")/);
  expect(sql).toContain('FOREIGN KEY ("definition_id","version_id")');
  expect(sql).toContain('FOREIGN KEY ("run_id","node_execution_id")');
});
