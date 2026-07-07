import { describe, it, expect } from "bun:test";
import {
  UserModel,
  AccountModel,
  SessionModel,
  VerificationModel,
} from "@/modules/user/models";
import type { ColumnSchema, TableSchema } from "@damatjs/orm-type";

// ─────────────────────────────────────────────────────────────────────────────
// These tests assert the table schema produced by the @damatjs/orm-model builders
// for the user module's models. They are pure (no DB) — they only inspect the
// in-memory schema produced by `.toTableSchema()`. Constructing a model auto-
// registers it in a global registry, but every test below resolves columns by
// name so ordering / registration side-effects never affect assertions.
// ─────────────────────────────────────────────────────────────────────────────

const col = (schema: TableSchema, name: string): ColumnSchema => {
  const found = schema.columns.find((c) => c.name === name);
  if (!found) throw new Error(`column "${name}" not found in ${schema.name}`);
  return found;
};

const colNames = (schema: TableSchema): string[] =>
  schema.columns.map((c) => c.name);

// Every model in this module has timestamps + soft-delete enabled by default.
// Auto-timestamps are timestamptz (sub-second); updated_at is maintained on
// every write, so it is NOT NULL with a now() default (not perpetually NULL).
const expectAuditColumns = (schema: TableSchema) => {
  const createdAt = col(schema, "created_at");
  expect(createdAt.type).toBe("timestamp with time zone");
  expect(createdAt.nullable).toBe(false);
  expect(createdAt.default).toBe("now()");

  const updatedAt = col(schema, "updated_at");
  expect(updatedAt.type).toBe("timestamp with time zone");
  expect(updatedAt.nullable).toBe(false);
  expect(updatedAt.default).toBe("now()");

  const deletedAt = col(schema, "deleted_at");
  expect(deletedAt.type).toBe("timestamp with time zone");
  expect(deletedAt.nullable).toBe(true);
};

describe("models › UserModel", () => {
  const schema = UserModel.toTableSchema();

  it("uses the table name 'users'", () => {
    expect(schema.name).toBe("users");
    expect(UserModel._tableName).toBe("users");
  });

  it("defines a prefixed text primary key", () => {
    const id = col(schema, "id");
    expect(id.type).toBe("text");
    expect(id.primaryKey).toBe(true);
    expect(id.nullable).toBe(false);
    expect(id.default).toBe("generate_id('usr')");
  });

  it("email is a unique, non-null text column", () => {
    const email = col(schema, "email");
    expect(email.type).toBe("text");
    expect(email.unique).toBe(true);
    expect(email.nullable).toBe(false);
  });

  it("emailVerified is a boolean defaulting to false", () => {
    const v = col(schema, "emailVerified");
    expect(v.type).toBe("boolean");
    expect(v.nullable).toBe(false);
    // default is serialised as the SQL literal string "false"
    expect(v.default).toBe("false");
  });

  it("name and image are nullable text columns", () => {
    expect(col(schema, "name").nullable).toBe(true);
    expect(col(schema, "name").type).toBe("text");
    expect(col(schema, "image").nullable).toBe(true);
    expect(col(schema, "image").type).toBe("text");
  });

  it("has a unique btree index on email", () => {
    const idx = schema.indexes.find((i) => i.name === "users_email");
    expect(idx).toBeDefined();
    expect(idx!.unique).toBe(true);
    expect(idx!.type).toBe("btree");
    expect(idx!.columns).toEqual([{ name: "email" }]);
  });

  it("declares hasMany relations to accounts and sessions (no FK columns)", () => {
    expect(schema.foreignKeys).toEqual([]);
    const accounts = schema.relations.find((r) => r.from === "accounts");
    const sessions = schema.relations.find((r) => r.from === "sessions");
    expect(accounts).toMatchObject({
      fromTable: "users",
      to: "accounts",
      type: "hasMany",
    });
    expect(sessions).toMatchObject({
      fromTable: "users",
      to: "sessions",
      type: "hasMany",
    });
    // hasMany relations do not create DB columns
    expect(colNames(schema)).not.toContain("accounts");
    expect(colNames(schema)).not.toContain("sessions");
  });

  it("includes audit columns", () => expectAuditColumns(schema));
});

describe("models › AccountModel", () => {
  const schema = AccountModel.toTableSchema();

  it("uses the table name 'accounts' with prefixed PK", () => {
    expect(schema.name).toBe("accounts");
    const id = col(schema, "id");
    expect(id.primaryKey).toBe(true);
    expect(id.default).toBe("generate_id('acc')");
  });

  it("belongsTo user produces a non-null text FK column user_id", () => {
    const fkCol = col(schema, "user_id");
    expect(fkCol.type).toBe("text");
    expect(fkCol.nullable).toBe(false);
    expect(fkCol.primaryKey).toBe(false);
  });

  it("emits a foreign key constraint to users.id", () => {
    expect(schema.foreignKeys).toHaveLength(1);
    const fk = schema.foreignKeys[0]!;
    expect(fk.referencedTable).toBe("users");
    expect(fk.referencedColumns).toEqual(["id"]);
    expect(fk.columns).toEqual([{ name: "user_id", type: "text" }]);
    expect(fk.indexed).toBe(true);
  });

  it("declares a belongsTo relation linked by user_id", () => {
    const rel = schema.relations.find((r) => r.type === "belongsTo");
    expect(rel).toMatchObject({
      fromTable: "accounts",
      from: "user",
      to: "users",
      type: "belongsTo",
      linkedBy: ["user_id"],
    });
  });

  it("required text columns: accountId and providerId are non-null", () => {
    expect(col(schema, "accountId").nullable).toBe(false);
    expect(col(schema, "providerId").nullable).toBe(false);
  });

  it("oauth token columns are nullable", () => {
    for (const name of [
      "accessToken",
      "refreshToken",
      "scope",
      "idToken",
      "password",
    ]) {
      expect(col(schema, name).type).toBe("text");
      expect(col(schema, name).nullable).toBe(true);
    }
  });

  it("expiry columns are nullable timestamps", () => {
    for (const name of ["accessTokenExpiresAt", "refreshTokenExpiresAt"]) {
      expect(col(schema, name).type).toBe("timestamp without time zone");
      expect(col(schema, name).nullable).toBe(true);
    }
  });

  it("has explicit indexes plus an auto-added FK index on user_id", () => {
    const named = schema.indexes.map((i) => i.name).filter(Boolean);
    expect(named).toContain("accounts_accountId");
    expect(named).toContain("accounts_providerId");
    expect(named).toContain("accounts_providerId_accountId");

    const composite = schema.indexes.find(
      (i) => i.name === "accounts_providerId_accountId",
    )!;
    expect(composite.columns).toEqual([
      { name: "providerId" },
      { name: "accountId" },
    ]);

    // The .indexed() FK relation appends an unnamed index on the FK column
    const fkIndex = schema.indexes.find(
      (i) => !i.name && (i.columns as string[]).includes("user_id"),
    );
    expect(fkIndex).toBeDefined();
  });

  it("includes audit columns", () => expectAuditColumns(schema));
});

describe("models › SessionModel", () => {
  const schema = SessionModel.toTableSchema();

  it("uses the table name 'sessions' with prefixed PK", () => {
    expect(schema.name).toBe("sessions");
    expect(col(schema, "id").default).toBe("generate_id('ses')");
  });

  it("token is a unique non-null text column", () => {
    const token = col(schema, "token");
    expect(token.type).toBe("text");
    expect(token.unique).toBe(true);
    expect(token.nullable).toBe(false);
  });

  it("expiresAt is a non-null timestamp", () => {
    const exp = col(schema, "expiresAt");
    expect(exp.type).toBe("timestamp without time zone");
    expect(exp.nullable).toBe(false);
  });

  it("ipAddress is a nullable varchar(45)", () => {
    const ip = col(schema, "ipAddress");
    expect(ip.type).toBe("character varying");
    expect(ip.length).toBe(45);
    expect(ip.nullable).toBe(true);
  });

  it("userAgent is a nullable text column", () => {
    expect(col(schema, "userAgent").type).toBe("text");
    expect(col(schema, "userAgent").nullable).toBe(true);
  });

  it("belongsTo user with FK + auto FK index", () => {
    const fkCol = col(schema, "user_id");
    expect(fkCol.type).toBe("text");
    expect(fkCol.nullable).toBe(false);

    expect(schema.foreignKeys).toHaveLength(1);
    expect(schema.foreignKeys[0]!.referencedTable).toBe("users");

    const fkIndex = schema.indexes.find(
      (i) => !i.name && (i.columns as string[]).includes("user_id"),
    );
    expect(fkIndex).toBeDefined();
  });

  it("has a non-unique btree index on token", () => {
    const idx = schema.indexes.find((i) => i.name === "sessions_token");
    expect(idx).toBeDefined();
    expect(idx!.unique).toBe(false);
  });

  it("includes audit columns", () => expectAuditColumns(schema));
});

describe("models › VerificationModel", () => {
  const schema = VerificationModel.toTableSchema();

  it("uses the table name 'verifications' with prefixed PK", () => {
    expect(schema.name).toBe("verifications");
    expect(col(schema, "id").default).toBe("generate_id('vrf')");
    expect(col(schema, "id").primaryKey).toBe(true);
  });

  it("identifier and value are non-null text columns", () => {
    expect(col(schema, "identifier").type).toBe("text");
    expect(col(schema, "identifier").nullable).toBe(false);
    expect(col(schema, "value").type).toBe("text");
    expect(col(schema, "value").nullable).toBe(false);
  });

  it("expiresAt is a non-null timestamp", () => {
    const exp = col(schema, "expiresAt");
    expect(exp.type).toBe("timestamp without time zone");
    expect(exp.nullable).toBe(false);
  });

  it("has a btree index on identifier and no relations / FKs", () => {
    const idx = schema.indexes.find((i) => i.name === "verifications_identifier");
    expect(idx).toBeDefined();
    expect(idx!.columns).toEqual([{ name: "identifier" }]);
    expect(schema.foreignKeys).toEqual([]);
    expect(schema.relations).toEqual([]);
  });

  it("includes audit columns", () => expectAuditColumns(schema));
});

describe("models › cross-cutting invariants", () => {
  it("toTableSchema is deterministic across calls (order-independent)", () => {
    const a = UserModel.toTableSchema();
    const b = UserModel.toTableSchema();
    expect(colNames(a)).toEqual(colNames(b));
    expect(a.name).toBe(b.name);
  });

  it("every model exposes exactly one primary key column", () => {
    for (const m of [UserModel, AccountModel, SessionModel, VerificationModel]) {
      const pks = m.toTableSchema().columns.filter((c) => c.primaryKey);
      expect(pks).toHaveLength(1);
      expect(pks[0]!.name).toBe("id");
    }
  });
});
