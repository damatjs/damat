import { expect, mock, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { applyModuleMigrations } from "../src/harness/migrate";

test("harness surfaces a declared migration failure", async () => {
  const root = mkdtempSync(join(tmpdir(), "damat-harness-failure-"));
  const migrations = join(root, "src/migrations");
  mkdirSync(migrations, { recursive: true });
  writeFileSync(join(migrations, "Migration001_Broken.sql"), "INVALID SQL");
  const query = mock(async (sql: string) => {
    if (sql === "INVALID SQL") throw new Error("invalid migration");
    return { rows: [], rowCount: 0 };
  });
  const pool = {
    query,
    connect: async () => ({ query, release: () => {} }),
  };
  try {
    await expect(
      applyModuleMigrations(
        pool as never,
        root,
        {
          name: "broken-harness",
          paths: { migrations: "./src/migrations" },
        } as never,
        { info: () => {} } as never,
      ),
    ).rejects.toThrow("invalid migration");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("harness skips every migration when explicitly disabled", async () => {
  const query = mock(async () => ({ rows: [], rowCount: 0 }));
  await applyModuleMigrations(
    { query } as never,
    "/unused",
    { name: "disabled" } as never,
    { info: () => {} } as never,
    false,
  );
  expect(query).not.toHaveBeenCalled();
});
