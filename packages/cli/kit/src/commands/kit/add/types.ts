import type { PlannedFile } from "../plan";

export interface InstalledKitRecord {
  name: string;
  version?: string;
  source: string;
  sourceType: "path" | "git";
  installedAt: string;
  files: string[];
}

export interface CopyResult {
  written: PlannedFile[];
  skipped: PlannedFile[];
}
