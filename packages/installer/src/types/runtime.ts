export interface CommandSpec {
  command: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type CommandRunner = (spec: CommandSpec) => Promise<CommandResult>;

export interface InstallerLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface InstallerRuntime {
  run: CommandRunner;
  logger: InstallerLogger;
  dryRun?: boolean;
  packageManager?: "bun" | "npm" | "pnpm" | "yarn";
  allowScripts?: boolean;
  afterOperation?(completed: number): void;
}
