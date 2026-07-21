import { describe, expect, test } from "bun:test";
import {
  assertSecurityAllowed,
  evaluateSecurity,
  type SecurityInput,
  type VerificationPolicy,
} from "../../index";

const input = (
  policy: VerificationPolicy,
  verification: SecurityInput["verification"] = "unverified",
): SecurityInput => ({
  origin: { type: "git", url: "https://example.com/repo.git", ref: "main" },
  immutableIdentity: "git:sha",
  computedIntegrity: "sha256:value",
  verification,
  verificationSource: "direct",
  mode: "source",
  policy,
});

describe("security policy", () => {
  test("applies off, warn, and require to unverified origins", () => {
    expect(evaluateSecurity(input("off")).allowed).toBeTrue();
    expect(evaluateSecurity(input("warn")).warnings[0]).toContain("unverified");
    expect(evaluateSecurity(input("require")).allowed).toBeFalse();
  });

  test.each(["rejected", "revoked"] as const)(
    "always denies %s registry status",
    (verification) => {
      const report = evaluateSecurity({
        ...input("off", verification),
        origin: { type: "registry", ref: "unsafe" },
      });
      expect(report.allowed).toBeFalse();
      expect(() => assertSecurityAllowed(report)).toThrow(verification);
    },
  );

  test("allows verified inputs and rejects integrity mismatches", () => {
    expect(evaluateSecurity(input("require", "verified")).allowed).toBeTrue();
    const report = evaluateSecurity({
      ...input("off", "verified"),
      expectedIntegrity: "sha256:other",
    });
    expect(report.allowed).toBeFalse();
    expect(report.findings[0]?.code).toBe("integrity-mismatch");
  });
});
