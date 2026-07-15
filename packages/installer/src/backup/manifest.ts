import type { ArtifactProvenance } from "../types/lockfile";

export interface BackupFile {
  path: string;
  checksum: string;
  storedAs: string;
}

export interface BackupManifest {
  id: string;
  createdAt: string;
  artifactId: string;
  provenance: ArtifactProvenance;
  files: BackupFile[];
}
