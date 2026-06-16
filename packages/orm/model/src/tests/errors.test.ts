import { describe, it, expect } from "bun:test";
import {
  OrmError,
  ConnectionError,
  QueryError,
  ModelError,
  ValidationError,
  NotFoundError,
  DuplicateError,
  TransactionError,
  MigrationError,
  transformPgError,
} from "@/errors/errors";

// ─────────────────────────────────────────────────────────────────────────────
// Error class hierarchy — code, name, message, details payloads
// ─────────────────────────────────────────────────────────────────────────────

describe("error classes › base OrmError", () => {
  it("carries message, code and details and is an Error", () => {
    const e = new OrmError("boom", "X_CODE", { a: 1 });
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(OrmError);
    expect(e.message).toBe("boom");
    expect(e.code).toBe("X_CODE");
    expect(e.details).toEqual({ a: 1 });
    expect(e.name).toBe("OrmError");
  });

  it("details is optional", () => {
    const e = new OrmError("m", "C");
    expect(e.details).toBeUndefined();
  });
});

describe("error classes › subclasses", () => {
  it("ConnectionError sets CONNECTION_ERROR code and name", () => {
    const e = new ConnectionError("db down", { host: "x" });
    expect(e).toBeInstanceOf(OrmError);
    expect(e.code).toBe("CONNECTION_ERROR");
    expect(e.name).toBe("ConnectionError");
    expect(e.details).toEqual({ host: "x" });
  });

  it("QueryError exposes sql/params and folds them into details", () => {
    const e = new QueryError("bad sql", "SELECT 1", [1, 2], { extra: true });
    expect(e.code).toBe("QUERY_ERROR");
    expect(e.name).toBe("QueryError");
    expect(e.sql).toBe("SELECT 1");
    expect(e.params).toEqual([1, 2]);
    // sql + params are merged into details alongside any extra fields
    expect(e.details).toEqual({ sql: "SELECT 1", params: [1, 2], extra: true });
  });

  it("ModelError sets MODEL_ERROR code", () => {
    const e = new ModelError("nope");
    expect(e.code).toBe("MODEL_ERROR");
    expect(e.name).toBe("ModelError");
  });

  it("ValidationError carries field + value", () => {
    const e = new ValidationError("invalid", "age", -1);
    expect(e.code).toBe("VALIDATION_ERROR");
    expect(e.name).toBe("ValidationError");
    expect(e.field).toBe("age");
    expect(e.value).toBe(-1);
    expect(e.details).toEqual({ field: "age", value: -1 });
  });

  it("NotFoundError builds a descriptive message from criteria", () => {
    const e = new NotFoundError("User", { id: "u1" });
    expect(e.code).toBe("NOT_FOUND");
    expect(e.name).toBe("NotFoundError");
    expect(e.model).toBe("User");
    expect(e.criteria).toEqual({ id: "u1" });
    expect(e.message).toBe('User not found with criteria: {"id":"u1"}');
  });

  it("DuplicateError builds a descriptive message from field/value", () => {
    const e = new DuplicateError("User", "email", "a@b.com");
    expect(e.code).toBe("DUPLICATE_ERROR");
    expect(e.name).toBe("DuplicateError");
    expect(e.model).toBe("User");
    expect(e.field).toBe("email");
    expect(e.value).toBe("a@b.com");
    expect(e.message).toBe('User with email="a@b.com" already exists');
  });

  it("TransactionError sets TRANSACTION_ERROR code", () => {
    const e = new TransactionError("rollback");
    expect(e.code).toBe("TRANSACTION_ERROR");
    expect(e.name).toBe("TransactionError");
  });

  it("MigrationError records the migration name in details", () => {
    const e = new MigrationError("failed", "0001_init", { step: 2 });
    expect(e.code).toBe("MIGRATION_ERROR");
    expect(e.name).toBe("MigrationError");
    expect(e.migration).toBe("0001_init");
    expect(e.details).toEqual({ migration: "0001_init", step: 2 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// transformPgError — maps raw pg driver errors onto typed ORM errors
// ─────────────────────────────────────────────────────────────────────────────

describe("transformPgError", () => {
  it("unique violation with a parseable detail → DuplicateError(field,value)", () => {
    const pg: any = new Error("duplicate key value");
    pg.code = "23505";
    pg.table = "users";
    pg.detail = "Key (email)=(a@b.com) already exists.";
    const out = transformPgError(pg) as DuplicateError;
    expect(out).toBeInstanceOf(DuplicateError);
    expect(out.model).toBe("users");
    expect(out.field).toBe("email");
    expect(out.value).toBe("a@b.com");
  });

  it("unique violation parses composite key columns/values from detail", () => {
    const pg: any = new Error("dup");
    pg.code = "23505";
    pg.table = "memberships";
    pg.detail = "Key (user_id, org_id)=(1, 2) already exists.";
    const out = transformPgError(pg) as DuplicateError;
    expect(out).toBeInstanceOf(DuplicateError);
    expect(out.field).toBe("user_id, org_id");
    expect(out.value).toBe("1, 2");
  });

  it("unique violation without detail falls back to generic Record/field/value", () => {
    const pg: any = new Error("dup");
    pg.code = "23505";
    const out = transformPgError(pg) as DuplicateError;
    expect(out).toBeInstanceOf(DuplicateError);
    expect(out.model).toBe("Record");
    expect(out.field).toBe("field");
    expect(out.value).toBe("value");
  });

  it("unique violation without table uses 'Record' as model name", () => {
    const pg: any = new Error("dup");
    pg.code = "23505";
    pg.detail = "Key (sku)=(ABC) already exists.";
    const out = transformPgError(pg) as DuplicateError;
    expect(out.model).toBe("Record");
    expect(out.field).toBe("sku");
    expect(out.value).toBe("ABC");
  });

  it("undefined-table (42P01) → QueryError carrying sql + params + pgError", () => {
    const pg: any = new Error('relation "ghost" does not exist');
    pg.code = "42P01";
    const out = transformPgError(pg, "SELECT * FROM ghost", [42]) as QueryError;
    expect(out).toBeInstanceOf(QueryError);
    expect(out.message).toContain("Table does not exist");
    expect(out.message).toContain("ghost");
    expect(out.sql).toBe("SELECT * FROM ghost");
    expect(out.params).toEqual([42]);
    expect(out.details?.pgError).toBe(pg);
  });

  it("42P01 with no sql provided defaults sql to empty string", () => {
    const pg: any = new Error("relation does not exist");
    pg.code = "42P01";
    const out = transformPgError(pg) as QueryError;
    expect(out.sql).toBe("");
    expect(out.params).toBeUndefined();
  });

  it("unmapped code → generic QueryError preserving original message + code", () => {
    const pg: any = new Error("something else");
    pg.code = "23503"; // FK violation — not specially handled
    const out = transformPgError(pg, "DELETE FROM a", [1]) as QueryError;
    expect(out).toBeInstanceOf(QueryError);
    expect(out.message).toBe("something else");
    expect(out.sql).toBe("DELETE FROM a");
    expect(out.params).toEqual([1]);
    expect(out.details?.code).toBe("23503");
    expect(out.details?.pgError).toBe(pg);
  });

  it("error with no code at all → generic QueryError", () => {
    const pg: any = new Error("mystery");
    const out = transformPgError(pg) as QueryError;
    expect(out).toBeInstanceOf(QueryError);
    expect(out.message).toBe("mystery");
    expect(out.details?.code).toBeUndefined();
  });
});
