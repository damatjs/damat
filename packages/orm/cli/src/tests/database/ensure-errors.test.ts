import { describe, expect, test } from "bun:test";
import { ensurePostgresDatabase } from "../../database";
import { clients, pgError } from "./fixture";

describe("ensurePostgresDatabase errors", () => {
  test("requires a target database name", async () => {
    const fake = clients([]);
    await expect(
      ensurePostgresDatabase("postgres://u:p@db", fake.factory),
    ).rejects.toThrow("include a database name");
    expect(fake.urls).toHaveLength(0);
  });

  test("preserves target connection errors other than missing database", async () => {
    const failure = new Error("authentication failed");
    const fake = clients([{ connectError: failure }]);
    await expect(
      ensurePostgresDatabase("postgres://u:p@db/app", fake.factory),
    ).rejects.toBe(failure);
    expect(fake.ends()).toBe(1);
    const coded = pgError("28P01");
    const other = clients([{ connectError: coded }]);
    await expect(
      ensurePostgresDatabase("postgres://u:p@db/app", other.factory),
    ).rejects.toBe(coded);
  });

  test("closes the admin client when connecting or creating fails", async () => {
    const adminFailure = new Error("admin unavailable");
    const connect = clients([
      { connectError: pgError("3D000") },
      { connectError: adminFailure },
    ]);
    await expect(
      ensurePostgresDatabase("postgres://u:p@db/app", connect.factory),
    ).rejects.toBe(adminFailure);
    expect(connect.ends()).toBe(2);
    const createFailure = pgError("42501");
    const create = clients([
      { connectError: pgError("3D000") },
      { createError: createFailure },
    ]);
    await expect(
      ensurePostgresDatabase("postgres://u:p@db/app", create.factory),
    ).rejects.toBe(createFailure);
    expect(create.ends()).toBe(2);
  });
});
