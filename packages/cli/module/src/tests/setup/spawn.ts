import { fakeSpawnResult } from "../helpers";
import { state, type SpawnCall } from "./state";

export const spawnCalls: SpawnCall[] = [];

const defaultHandler = (options: SpawnCall): { exited: Promise<number> } => {
  spawnCalls.push(options);
  return fakeSpawnResult(state.spawnExitCode);
};
let handler = defaultHandler;

export function setSpawnHandler(
  next: (options: SpawnCall) => { exited: Promise<number> },
): void {
  handler = next;
}

export function resetSpawnHandler(): void {
  handler = defaultHandler;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Bun as any).spawn = (options: SpawnCall) => handler(options);
