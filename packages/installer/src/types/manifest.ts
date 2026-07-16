import type { InstallMode } from "./recipe";

export type DamatKind = "application" | "module" | "kit" | "package";
export type PackageBackend = "node" | "damat";

export interface ProvidedCapability {
  from: string;
  fallbackTo?: string;
}

export interface AcceptedCapability {
  to: string;
}

export interface InstallInstructions {
  add?: string[];
  remove?: string[];
}

export interface DamatInstallProfile {
  modes?: InstallMode[];
  default?: InstallMode;
  packageBackends?: PackageBackend[];
  provides?: Record<string, ProvidedCapability>;
  accepts?: Record<string, AcceptedCapability>;
  ignore?: string[];
  packages?: Record<string, string>;
  usageHints?: { token: string; targets?: string[] }[];
  instructions?: InstallInstructions;
}

export interface DamatManifest {
  $schema?: string;
  schemaVersion: 1;
  kind: DamatKind;
  name: string;
  version?: string;
  install?: DamatInstallProfile;
  module?: Record<string, unknown>;
}
