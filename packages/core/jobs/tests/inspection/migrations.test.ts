import { expect, test } from "bun:test";
import { jobsSystemMigrations } from "../../src/migrations/catalog";

test("jobs inspection indexes are migration 003", () => {
  expect(jobsSystemMigrations.migrations.map(({ id }) => id)).toEqual([
    "001",
    "002",
    "003",
  ]);
  const sql = jobsSystemMigrations.migrations[2]!.sql;
  expect(sql).toContain(
    "date_trunc('milliseconds', \"created_at\" AT TIME ZONE 'UTC')",
  );
  expect(sql).toContain('"lease_expires_at"');
  expect(sql).toContain(
    'ON "_damat_job_activity" ("occurred_at", "type", "run_id")',
  );
  expect(sql).toContain('ADD COLUMN "wait_ms" BIGINT');
  expect(sql).not.toContain('"wait_ms" BIGINT NOT NULL DEFAULT 0');
  expect(sql).toContain('ADD COLUMN "available_at" TIMESTAMPTZ');
  expect(sql).toContain('ON "_damat_job_attempts" ("started_at", "wait_ms")');
  expect(sql).toContain('WHERE "wait_ms" IS NOT NULL');
});
