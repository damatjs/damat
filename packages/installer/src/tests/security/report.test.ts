import { describe, expect, test } from "bun:test";
import { evaluateSecurity } from "../../index";

const base = {
  origin: { type: "npm" as const, name: "pkg", version: "1.0.0" },
  immutableIdentity: "npm:pkg@1.0.0",
  expectedIntegrity: "sha256:x",
  computedIntegrity: "sha256:x",
  verification: "verified" as const,
  verificationSource: "registry",
  mode: "package" as const,
  policy: "require" as const,
};

describe("security reports", () => {
  test("contains complete structured context", () => {
    expect(evaluateSecurity(base)).toMatchObject({
      allowed: true,
      origin: base.origin,
      immutableIdentity: base.immutableIdentity,
      expectedIntegrity: "sha256:x",
      computedIntegrity: "sha256:x",
      mode: "package",
      verificationSource: "registry",
    });
  });

  test("denies executable recipe fields, unsafe archives, and unapproved package scripts", () => {
    const report = evaluateSecurity({
      ...base,
      recipe: { hooks: ["run"], nested: { command: "danger" } },
      archiveFindings: ["escaping link"],
      packageScripts: ["postinstall"],
    });
    expect(report.allowed).toBeFalse();
    expect(report.findings.map(({ code }) => code)).toEqual([
      "executable-recipe-field",
      "unsafe-archive",
      "package-scripts",
    ]);
    expect(
      evaluateSecurity({
        ...base,
        packageScripts: ["postinstall"],
        allowScripts: true,
      }).allowed,
    ).toBeTrue();
  });
});
