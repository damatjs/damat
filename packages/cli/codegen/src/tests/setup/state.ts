export interface SpawnCall {
  cmd: string[];
  cwd?: string;
  env?: Record<string, string>;
  [key: string]: unknown;
}

export const state = {
  existsMap: {} as Record<string, boolean>,
  existsDefault: false,
  spawnExitCode: 0,
  readdirResult: ["app.ts"] as string[],
  statIsDirectory: false,
  readFileMap: {} as Record<string, string>,
  spawnSyncResult: { status: 0 as number | null, stdout: "", stderr: "" },
};

export function resetSetup(): void {
  state.existsMap = {};
  state.existsDefault = false;
  state.spawnExitCode = 0;
  state.readdirResult = ["app.ts"];
  state.statIsDirectory = false;
  state.readFileMap = {};
  state.spawnSyncResult = { status: 0, stdout: "", stderr: "" };
}
