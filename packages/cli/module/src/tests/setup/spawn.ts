import { fakeSpawnResult } from "../helpers";
import { state, type SpawnCall } from "./state";

export const spawnCalls: SpawnCall[] = [];

let handler = (options: SpawnCall): { exited: Promise<number> } => {
  spawnCalls.push(options);
  return fakeSpawnResult(state.spawnExitCode);
};

export function setSpawnHandler(
  next: (options: SpawnCall) => { exited: Promise<number> },
): void {
  handler = next;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Bun as any).spawn = (options: SpawnCall) => handler(options);
