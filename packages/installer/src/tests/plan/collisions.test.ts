import { expect, test } from "bun:test";
import {
  analyzeOwnership,
  type InstallerLock,
  type InstallerPlan,
} from "../../index";

test("counts shared package owners from installation records", () => {
  const record = {
    artifactId: "blade",
    kind: "module",
    mode: "source" as const,
    provenance: {
      request: { type: "local" as const, path: "." },
      immutableIdentity: "local:x",
      resolvedAt: "now",
      metadata: {},
    },
    artifactIntegrity: "a",
    recipeIntegrity: "r",
    verification: "verified" as const,
    installedAt: "now",
    files: [],
    packages: [{ name: "zod", reference: "^4" }],
    usageHints: [],
  };
  const lock: InstallerLock = {
    schemaVersion: 1,
    installations: {
      first: record,
      second: { ...record, artifactId: "second" },
    },
  };
  const plan = {
    projectDir: ".",
    installationId: "next",
    operations: [],
  } as unknown as InstallerPlan;
  expect(analyzeOwnership(plan, lock).packageOwners).toEqual({ zod: 2 });
});
