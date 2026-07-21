export interface WorkspacePackage {
  dir: string;
  name: string;
  version: string;
  private?: boolean;
  scripts?: Record<string, string>;
}

export interface CommandResult {
  status: number;
  stdout: string;
  stderr: string;
}

export interface PublishOptions {
  dryRun: boolean;
  provenance: boolean;
}
