import { mock } from "bun:test";

export interface SpawnResult {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

export let spawnCalls: { cmd: string; args: string[]; opts: any }[] = [];
let nextSpawn: SpawnResult = { status: 0, stdout: "Done.", stderr: "" };
const savedCli = process.env.DAMAT_CLI;
const savedAppDir = process.env.DAMAT_APP_DIR;

mock.module("node:child_process", () => ({
  spawnSync: (cmd: string, args: string[], opts: any) => {
    spawnCalls.push({ cmd, args, opts });
    return nextSpawn;
  },
}));

export const { addModule } = await import("../tools/add-module");
export const { removeModule } = await import("../tools/remove-module");
export const { updateModule } = await import("../tools/update-module");
export const { runDamat } = await import("../app/cli");

export function resetCliMock(): void {
  spawnCalls = [];
  nextSpawn = { status: 0, stdout: "Done.", stderr: "" };
  delete process.env.DAMAT_CLI;
  delete process.env.DAMAT_APP_DIR;
}

export function restoreCliEnvironment(): void {
  if (savedCli === undefined) delete process.env.DAMAT_CLI;
  else process.env.DAMAT_CLI = savedCli;
  if (savedAppDir === undefined) delete process.env.DAMAT_APP_DIR;
  else process.env.DAMAT_APP_DIR = savedAppDir;
}

export function setSpawnResult(result: SpawnResult): void {
  nextSpawn = result;
}

export function lastArgs(): string[] {
  return spawnCalls[spawnCalls.length - 1]!.args;
}
