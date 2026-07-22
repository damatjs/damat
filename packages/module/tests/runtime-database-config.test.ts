import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { resolveDatabaseConfig } from "../src/harness/database";

let savedDatabaseUrl: string | undefined;

beforeEach(() => {
  savedDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
});

afterEach(() => {
  if (savedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedDatabaseUrl;
});

describe("resolveDatabaseConfig", () => {
  test("explicit database config wins", () => {
    const database = { connectionString: "postgres://explicit", max: 9 } as any;
    expect(resolveDatabaseConfig({ database })).toBe(database);
  });

  test("uses databaseUrl with test pool defaults", () => {
    const config = resolveDatabaseConfig({ databaseUrl: "postgres://opt" });
    expect(config.connectionString).toBe("postgres://opt");
    expect(config.max).toBe(2);
  });

  test("falls back to DATABASE_URL", () => {
    process.env.DATABASE_URL = "postgres://env";
    expect(resolveDatabaseConfig({}).connectionString).toBe("postgres://env");
  });

  test("rejects absent database configuration", () => {
    expect(() => resolveDatabaseConfig({})).toThrow(
      "bootModule needs a database",
    );
  });
});
