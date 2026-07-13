import { describe, it, expect } from "bun:test";
import { betterAuthSchema } from "@/modules/user/config/schema/betterAuth";
import { schema } from "@/modules/user/config/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Config validation schemas for the user module's Better Auth credentials.
// Pure zod validation — no env, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

const SECRET_32 = "a".repeat(32);

describe("config › betterAuthSchema", () => {
  it("accepts a minimal config with a 32-char secret and applies defaults", () => {
    const r = betterAuthSchema.safeParse({ betterAuthSecret: SECRET_32 });
    expect(r.success).toBe(true);
    if (r.success) {
      // session ages default when omitted
      expect(r.data.sessionMaxAge).toBe(604800);
      expect(r.data.sessionUpdateAge).toBe(86400);
      expect(r.data.betterAuthUrl).toBeUndefined();
    }
  });

  it("rejects a secret shorter than 32 chars with a helpful message", () => {
    const r = betterAuthSchema.safeParse({ betterAuthSecret: "tooshort" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]!.message).toContain("at least 32 characters");
    }
  });

  it("rejects when the required secret is missing entirely", () => {
    expect(betterAuthSchema.safeParse({}).success).toBe(false);
  });

  it("coerces numeric session ages from strings (env-style input)", () => {
    const r = betterAuthSchema.safeParse({
      betterAuthSecret: SECRET_32,
      sessionMaxAge: "3600",
      sessionUpdateAge: "60",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.sessionMaxAge).toBe(3600);
      expect(r.data.sessionUpdateAge).toBe(60);
    }
  });

  it("validates betterAuthUrl as a URL when provided", () => {
    expect(
      betterAuthSchema.safeParse({
        betterAuthSecret: SECRET_32,
        betterAuthUrl: "https://auth.example.com",
      }).success,
    ).toBe(true);
    expect(
      betterAuthSchema.safeParse({
        betterAuthSecret: SECRET_32,
        betterAuthUrl: "not a url",
      }).success,
    ).toBe(false);
  });

  it("validates superAdminEmail as an email when provided", () => {
    expect(
      betterAuthSchema.safeParse({
        betterAuthSecret: SECRET_32,
        superAdminEmail: "admin@example.com",
      }).success,
    ).toBe(true);
    expect(
      betterAuthSchema.safeParse({
        betterAuthSecret: SECRET_32,
        superAdminEmail: "nope",
      }).success,
    ).toBe(false);
  });

  it("accepts optional OAuth provider credentials", () => {
    const r = betterAuthSchema.safeParse({
      betterAuthSecret: SECRET_32,
      googleClientId: "gid",
      googleClientSecret: "gsecret",
      githubClientId: "ghid",
      githubClientSecret: "ghsecret",
      adminSecret: "admin",
    });
    expect(r.success).toBe(true);
  });

  it("does NOT strip unknown keys by default (non-strict object)", () => {
    // betterAuthSchema is a plain z.object (not .strict()), so unknown keys are
    // simply dropped rather than rejected — documents current behavior.
    const r = betterAuthSchema.safeParse({
      betterAuthSecret: SECRET_32,
      somethingExtra: "ignored",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(
        (r.data as Record<string, unknown>).somethingExtra,
      ).toBeUndefined();
    }
  });
});

describe("config › combined schema", () => {
  it("requires a nested betterAuth object", () => {
    expect(schema.safeParse({}).success).toBe(false);
    const r = schema.safeParse({
      betterAuth: { betterAuthSecret: SECRET_32 },
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.betterAuth.sessionMaxAge).toBe(604800);
  });

  it("propagates nested validation errors (short secret)", () => {
    const r = schema.safeParse({
      betterAuth: { betterAuthSecret: "x" },
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.path.includes("betterAuthSecret")),
      ).toBe(true);
    }
  });
});
