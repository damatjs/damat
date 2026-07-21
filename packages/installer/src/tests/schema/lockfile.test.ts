import { describe, expect, test } from "bun:test";
import { parseInstallerLock } from "../../index";

const record = {
  artifactId: "auth-provider",
  kind: "provider",
  version: "1.2.3",
  mode: "source",
  provenance: {
    request: { type: "git", url: "https://example.com/auth.git", ref: "main" },
    immutableIdentity: "git:0123456789abcdef",
    resolvedAt: "2026-07-15T12:00:00.000Z",
    metadata: { commit: "0123456789abcdef" },
  },
  artifactIntegrity: "sha256-artifact",
  recipeIntegrity: "sha256-recipe",
  verification: "verified",
  installedAt: "2026-07-15T12:00:01.000Z",
  files: [{ path: "src/providers/auth.ts", checksum: "sha256-file" }],
  packages: [{ name: "zod", reference: "^4.0.0" }],
  usageHints: [{ token: "getAuth", targets: ["src/**/*.ts"] }],
};

const validLock = {
  schemaVersion: 1,
  installations: { "auth-provider": record },
};

describe("parseInstallerLock", () => {
  test("accepts immutable provenance and owned resources", () => {
    expect(parseInstallerLock(validLock)).toEqual(validLock);
  });

  test("represents shared package ownership through installation records", () => {
    const installations = {
      first: record,
      second: { ...record, artifactId: "second" },
    };
    const parsed = parseInstallerLock({ schemaVersion: 1, installations });
    expect(
      Object.values(parsed.installations).map((item) => item.packages[0]?.name),
    ).toEqual(["zod", "zod"]);
  });

  test.each([
    { ...validLock, schemaVersion: 2 },
    { schemaVersion: 1, installations: [] },
    { schemaVersion: 1, installations: { bad: { ...record, mode: "linked" } } },
    {
      schemaVersion: 1,
      installations: { bad: { ...record, verification: "trusted" } },
    },
    {
      schemaVersion: 1,
      installations: { bad: { ...record, artifactIntegrity: "" } },
    },
    {
      schemaVersion: 1,
      installations: {
        bad: { ...record, files: [{ path: "../escape", checksum: "sum" }] },
      },
    },
    {
      schemaVersion: 1,
      installations: {
        bad: {
          ...record,
          provenance: { ...record.provenance, immutableIdentity: "" },
        },
      },
    },
  ])("rejects malformed lock data", (input) => {
    expect(() => parseInstallerLock(input)).toThrow();
  });

  test("rejects unknown record fields", () => {
    expect(() =>
      parseInstallerLock({
        schemaVersion: 1,
        installations: { bad: { ...record, command: "run" } },
      }),
    ).toThrow("command");
  });
});
