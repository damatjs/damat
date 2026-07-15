import { fakeSpawnResult } from "../helpers";
import { state, type SpawnCall } from "./state";

export const spawnCalls: SpawnCall[] = [];

let spawnHandler = (options: SpawnCall) => {
  spawnCalls.push(options);
  return fakeSpawnResult(state.spawnExitCode);
};

export function setSpawnHandler(
  handler: (options: SpawnCall) => { exited: Promise<number> },
) {
  spawnHandler = handler;
}

export function resetSpawn() {
  spawnCalls.length = 0;
  spawnHandler = (options) => {
    spawnCalls.push(options);
    return fakeSpawnResult(state.spawnExitCode);
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Bun as any).spawn = (options: SpawnCall) => spawnHandler(options);
