export type InstallMode = "source" | "package";

export interface InstallMapping {
  from: string;
  to: string;
}

export interface UsageHint {
  token: string;
  targets?: string[];
}

export interface InstallRecipe {
  schemaVersion: 1;
  id: string;
  kind: string;
  version?: string;
  install?: { modes: InstallMode[]; default?: InstallMode };
  mappings?: InstallMapping[];
  ignore?: string[];
  package?: { name: string; ref?: string };
  packages?: Record<string, string>;
  usageHints?: UsageHint[];
}
