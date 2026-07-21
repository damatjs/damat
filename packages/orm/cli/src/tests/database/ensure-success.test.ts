import { describe, expect, test } from "bun:test";
import { ensurePostgresDatabase } from "../../database";
import { clients, pgError } from "./fixture";

describe("ensurePostgresDatabase success", () => {
  test("returns without an admin connection when the target exists", async () => {
    const fake = clients([{}]);
    expect(
      await ensurePostgresDatabase("postgres://u:p@db:5432/app", fake.factory),
    ).toEqual({ created: false });
    expect(fake.urls).toEqual(["postgres://u:p@db:5432/app"]);
    expect(fake.ends()).toBe(1);
  });

  test("recognizes a database created by another process", async () => {
    const fake = clients([
      { connectError: pgError("3D000") },
      { rows: [{ exists: 1 }] },
    ]);
    expect(
      await ensurePostgresDatabase("postgres://u:p@db/app", fake.factory),
    ).toEqual({ created: false });
    expect(fake.urls[1]).toBe("postgres://u:p@db/postgres");
    expect(fake.queries[0]).toEqual({
      sql: "SELECT 1 FROM pg_database WHERE datname = $1",
      values: ["app"],
    });
    expect(fake.ends()).toBe(2);
  });

  test("creates a safely quoted missing database", async () => {
    const fake = clients([{ connectError: pgError("3D000") }, {}]);
    const result = await ensurePostgresDatabase(
      "postgres://u:p@db/my%22app",
      fake.factory,
    );
    expect(result).toEqual({ created: true });
    expect(fake.queries[1]!.sql).toBe('CREATE DATABASE "my""app"');
  });

  test("treats duplicate-database races as successful creation", async () => {
    const fake = clients([
      { connectError: pgError("3D000") },
      { createError: pgError("42P04") },
    ]);
    expect(
      await ensurePostgresDatabase("postgres://u:p@db/app", fake.factory),
    ).toEqual({ created: true });
  });
});
