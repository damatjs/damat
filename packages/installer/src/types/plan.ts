import type { ArtifactProvenance } from "./lockfile";
import type { InstallMode } from "./recipe";
import type { PackageBackend } from "./manifest";
import type { UsageHint } from "./recipe";
import type { VerificationStatus } from "./security";

export type InstallerOperation =
  | {
      type: "write-file";
      source: string;
      target: string;
      checksum: string;
      adopt?: boolean;
    }
  | { type: "remove-file"; target: string; installedChecksum: string }
  | { type: "add-package"; name: string; reference: string }
  | { type: "remove-package"; name: string; reference: string }
  | { type: "backup-file"; target: string; currentChecksum: string };

export interface InstallerPlan {
  schemaVersion: 1;
  action: "add" | "update" | "remove";
  projectDir: string;
  installationId: string;
  kind: string;
  version?: string;
  mode: InstallMode;
  packageBackend?: PackageBackend;
  provenance: ArtifactProvenance;
  artifactIntegrity: string;
  recipeIntegrity: string;
  verification: VerificationStatus;
  usageHints: UsageHint[];
  operations: InstallerOperation[];
  warnings: string[];
  backupId?: string;
}
