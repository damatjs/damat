import type { OriginRequest } from "../types/origin";
import type { ArtifactProvenance } from "../types/lockfile";
import type { InstallMode } from "../types/recipe";
import type { CommandRunner } from "../types/runtime";
import type { VerificationStatus } from "../types/security";

export interface AcquiredArtifact {
  request: OriginRequest;
  rootDir: string;
  cleanup(): void;
  expectedIntegrity?: string;
  packageReference?: string;
  metadata: Record<string, string>;
}

export interface RegistryDescriptor {
  origin: OriginRequest;
  owner?: string;
  verification?: VerificationStatus;
  integrity?: string;
  packageReference?: string;
}

export interface FetchResponse {
  ok: boolean;
  status: number;
  arrayBuffer(): Promise<ArrayBuffer>;
  json(): Promise<unknown>;
}

export interface AcquisitionPorts {
  run: CommandRunner;
  fetch?: (url: string) => Promise<FetchResponse>;
  resolveRegistry?: (ref: string) => Promise<RegistryDescriptor>;
  tempRoot?: string;
}

export interface ResolvedArtifact extends AcquiredArtifact {
  integrity: string;
  immutableIdentity: string;
  provenance: ArtifactProvenance;
  supportedModes: InstallMode[];
}
