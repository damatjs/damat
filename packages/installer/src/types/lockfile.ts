import type { OriginRequest } from "./origin";
import type { InstallMode, UsageHint } from "./recipe";
import type { VerificationStatus } from "./security";

export interface ArtifactProvenance {
  request: OriginRequest;
  immutableIdentity: string;
  resolvedAt: string;
  metadata: Record<string, string>;
}

export interface OwnedFile {
  path: string;
  checksum: string;
}

export interface OwnedPackage {
  name: string;
  reference: string;
}

export interface InstallationRecord {
  artifactId: string;
  kind: string;
  version?: string;
  mode: InstallMode;
  provenance: ArtifactProvenance;
  artifactIntegrity: string;
  recipeIntegrity: string;
  verification: VerificationStatus;
  installedAt: string;
  files: OwnedFile[];
  packages: OwnedPackage[];
  usageHints: UsageHint[];
}

export interface InstallerLock {
  schemaVersion: 1;
  installations: Record<string, InstallationRecord>;
}
