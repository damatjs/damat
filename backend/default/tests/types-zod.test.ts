import { describe, it, expect } from "bun:test";
import {
  newUsersSchema,
  updateUsersSchema,
  UsersQuerySchema,
  UsersIdSchema,
} from "@/modules/user/types/users.zod";
import {
  newAccountsSchema,
  updateAccountsSchema,
  AccountsQuerySchema,
} from "@/modules/user/types/accounts.zod";
import {
  newSessionsSchema,
  updateSessionsSchema,
  SessionsQuerySchema,
} from "@/modules/user/types/sessions.zod";
import {
  newVerificationsSchema,
  updateVerificationsSchema,
  VerificationsQuerySchema,
} from "@/modules/user/types/verifications.zod";

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas (auto-generated from the ORM models). These tests assert that the
// schemas accept valid payloads and reject invalid ones, and that the inferred
// shape lines up with the underlying model columns. Pure validation — no I/O.
// ─────────────────────────────────────────────────────────────────────────────

describe("zod › users", () => {
  it("accepts a minimal valid new user (only email)", () => {
    const r = newUsersSchema.safeParse({ email: "a@b.co" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("a@b.co");
  });

  it("accepts optional/nullable fields", () => {
    const r = newUsersSchema.safeParse({
      email: "a@b.co",
      emailVerified: true,
      name: null,
      image: "http://x/y.png",
    });
    expect(r.success).toBe(true);
  });

  it("rejects a new user missing the required email", () => {
    const r = newUsersSchema.safeParse({ name: "Bob" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("email"))).toBe(true);
    }
  });

  it("rejects wrong-typed email", () => {
    expect(newUsersSchema.safeParse({ email: 123 }).success).toBe(false);
  });

  it("rejects extra/unknown fields (strict)", () => {
    const r = newUsersSchema.safeParse({ email: "a@b.co", role: "admin" });
    expect(r.success).toBe(false);
  });

  it("update schema makes every field optional", () => {
    expect(updateUsersSchema.safeParse({}).success).toBe(true);
    expect(updateUsersSchema.safeParse({ name: "X" }).success).toBe(true);
  });

  it("query schema coerces emailVerified and validates orderDir enum", () => {
    const r = UsersQuerySchema.safeParse({
      emailVerified: "true",
      orderDir: "asc",
      limit: "10",
      offset: "0",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.emailVerified).toBe(true);
      expect(r.data.limit).toBe(10);
    }
    expect(UsersQuerySchema.safeParse({ orderDir: "sideways" }).success).toBe(
      false,
    );
  });

  it("query schema rejects non-positive limit and negative offset", () => {
    expect(UsersQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
    expect(UsersQuerySchema.safeParse({ offset: "-1" }).success).toBe(false);
  });

  it("id schema accepts strings, rejects numbers", () => {
    expect(UsersIdSchema.safeParse("usr_1").success).toBe(true);
    expect(UsersIdSchema.safeParse(42).success).toBe(false);
  });

  it("inferred new-user shape covers exactly the writable model fields", () => {
    // `.shape` exposes the object's field map; compare its keys to the model's
    // writable columns (everything except id + audit/relation fields).
    const keys = Object.keys(newUsersSchema.shape).sort();
    expect(keys).toEqual(["email", "emailVerified", "image", "name"].sort());
  });
});

describe("zod › accounts", () => {
  const valid = {
    user_id: "usr_1",
    accountId: "acc-ext-1",
    providerId: "google",
  };

  it("accepts a valid new account with only required fields", () => {
    expect(newAccountsSchema.safeParse(valid).success).toBe(true);
  });

  it("coerces date fields from ISO strings", () => {
    const r = newAccountsSchema.safeParse({
      ...valid,
      accessTokenExpiresAt: "2030-01-01T00:00:00.000Z",
    });
    expect(r.success).toBe(true);
    if (r.success)
      expect(r.data.accessTokenExpiresAt).toBeInstanceOf(Date);
  });

  it("rejects missing required user_id / accountId / providerId", () => {
    expect(newAccountsSchema.safeParse({ accountId: "x", providerId: "y" }).success).toBe(false);
    expect(newAccountsSchema.safeParse({ user_id: "u", providerId: "y" }).success).toBe(false);
    expect(newAccountsSchema.safeParse({ user_id: "u", accountId: "x" }).success).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      newAccountsSchema.safeParse({ ...valid, hacker: true }).success,
    ).toBe(false);
  });

  it("rejects an un-coercible date", () => {
    expect(
      newAccountsSchema.safeParse({ ...valid, accessTokenExpiresAt: "not-a-date" })
        .success,
    ).toBe(false);
  });

  it("update schema accepts an empty object", () => {
    expect(updateAccountsSchema.safeParse({}).success).toBe(true);
  });

  it("query schema validates orderDir enum", () => {
    expect(AccountsQuerySchema.safeParse({ orderDir: "desc" }).success).toBe(true);
    expect(AccountsQuerySchema.safeParse({ orderDir: "up" }).success).toBe(false);
  });
});

describe("zod › sessions", () => {
  const valid = {
    user_id: "usr_1",
    token: "tok_abc",
    expiresAt: "2030-01-01T00:00:00.000Z",
  };

  it("accepts a valid new session and coerces expiresAt to Date", () => {
    const r = newSessionsSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.expiresAt).toBeInstanceOf(Date);
  });

  it("requires expiresAt", () => {
    const { expiresAt, ...rest } = valid;
    expect(newSessionsSchema.safeParse(rest).success).toBe(false);
  });

  it("enforces ipAddress max length of 45", () => {
    expect(
      newSessionsSchema.safeParse({ ...valid, ipAddress: "1".repeat(45) })
        .success,
    ).toBe(true);
    expect(
      newSessionsSchema.safeParse({ ...valid, ipAddress: "1".repeat(46) })
        .success,
    ).toBe(false);
  });

  it("allows null ipAddress / userAgent", () => {
    expect(
      newSessionsSchema.safeParse({ ...valid, ipAddress: null, userAgent: null })
        .success,
    ).toBe(true);
  });

  it("update schema applies the same ipAddress max length", () => {
    expect(
      updateSessionsSchema.safeParse({ ipAddress: "1".repeat(46) }).success,
    ).toBe(false);
  });

  it("query schema coerces expiresAt", () => {
    const r = SessionsQuerySchema.safeParse({ expiresAt: "2030-01-01" });
    expect(r.success).toBe(true);
  });
});

describe("zod › verifications", () => {
  const valid = {
    identifier: "a@b.co",
    value: "code-123",
    expiresAt: "2030-01-01T00:00:00.000Z",
  };

  it("accepts a valid new verification", () => {
    const r = newVerificationsSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.expiresAt).toBeInstanceOf(Date);
  });

  it("rejects missing identifier / value / expiresAt", () => {
    expect(newVerificationsSchema.safeParse({ value: "x", expiresAt: valid.expiresAt }).success).toBe(false);
    expect(newVerificationsSchema.safeParse({ identifier: "x", expiresAt: valid.expiresAt }).success).toBe(false);
    expect(newVerificationsSchema.safeParse({ identifier: "x", value: "y" }).success).toBe(false);
  });

  it("rejects extra fields (strict)", () => {
    expect(
      newVerificationsSchema.safeParse({ ...valid, extra: 1 }).success,
    ).toBe(false);
  });

  it("update schema accepts a partial object", () => {
    expect(updateVerificationsSchema.safeParse({ value: "new" }).success).toBe(true);
    expect(updateVerificationsSchema.safeParse({}).success).toBe(true);
  });

  it("query schema validates the orderDir enum and coerces limit", () => {
    const r = VerificationsQuerySchema.safeParse({ limit: "5", orderDir: "asc" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(5);
    expect(VerificationsQuerySchema.safeParse({ orderDir: "nope" }).success).toBe(false);
  });
});
