import type {
  DamatManifest,
  InstallationRecord,
  InstallerLock,
  InstallerPlan,
  ResolvedArtifact,
} from "@damatjs/installer";

export const request = { type: "local" as const, path: "/source" };

export function artifact(cleanup = () => {}): ResolvedArtifact {
  return {
    request,
    rootDir: "/source",
    cleanup,
    metadata: {},
    integrity: "tree",
    immutableIdentity: "local:tree",
    supportedModes: ["source", "package"],
    provenance: {
      request,
      immutableIdentity: "local:tree",
      resolvedAt: "now",
      metadata: {},
    },
  };
}

export function manifest(name = "billing"): DamatManifest {
  return {
    schemaVersion: 1,
    kind: "module",
    name,
    install: {
      modes: ["source", "package"],
      default: "source",
      packageBackends: ["node", "damat"],
      provides: { module: { from: "src/**", fallbackTo: "src/modules/{id}" } },
    },
  };
}

export function plan(action: InstallerPlan["action"] = "add"): InstallerPlan {
  return {
    schemaVersion: 1,
    action,
    projectDir: "/project",
    installationId: "billing",
    kind: "module",
    mode: "source",
    packageBackend: "damat",
    provenance: artifact().provenance,
    artifactIntegrity: "tree",
    recipeIntegrity: "recipe",
    verification: "verified",
    usageHints: [],
    operations: [],
    warnings: ["check usage"],
  };
}

export function record(kind = "module", id = "billing"): InstallationRecord {
  return {
    artifactId: id,
    kind,
    version: "1.0.0",
    mode: "package",
    packageBackend: "damat",
    provenance: artifact().provenance,
    artifactIntegrity: "tree",
    recipeIntegrity: "recipe",
    verification: "verified",
    installedAt: "now",
    files: [],
    packages: [],
    usageHints: [],
  };
}

export function lock(...records: InstallationRecord[]): InstallerLock {
  return {
    schemaVersion: 1,
    installations: Object.fromEntries(
      records.map((item) => [item.artifactId, item]),
    ),
  };
}
