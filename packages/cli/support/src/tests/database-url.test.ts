import { describe, expect, test } from "bun:test";
import {
  buildDatabaseUrl,
  databaseName,
  validateDatabaseUrl,
} from "../database";

describe("database URL helpers", () => {
  test("builds defaults and safely encodes supplied connection fields", () => {
    expect(buildDatabaseUrl({}, "my_app")).toBe(
      "postgres://postgres:postgres@localhost:5432/my_app",
    );
    expect(
      buildDatabaseUrl(
        {
          host: "db.internal",
          port: "6543",
          user: "a user",
          password: "p@ss",
          database: "custom",
        },
        "fallback",
      ),
    ).toBe("postgres://a%20user:p%40ss@db.internal:6543/custom");
    expect(buildDatabaseUrl({ password: "" }, "empty_password")).toBe(
      "postgres://postgres@localhost:5432/empty_password",
    );
    expect(databaseName("my-module")).toBe("my_module");
  });

  test("accepts postgres URLs and rejects invalid or incomplete values", () => {
    const postgres = "postgres://u:p@localhost:5432/app";
    const postgresql = "postgresql://u:p@localhost:5432/app";
    expect(validateDatabaseUrl(postgres)).toBe(postgres);
    expect(validateDatabaseUrl(postgresql)).toBe(postgresql);
    expect(() => validateDatabaseUrl("not a url")).toThrow("valid PostgreSQL");
    expect(() => validateDatabaseUrl("http://localhost/app")).toThrow(
      "must use postgres://",
    );
    expect(() => validateDatabaseUrl("postgres://localhost")).toThrow(
      "include a database name",
    );
  });
});
