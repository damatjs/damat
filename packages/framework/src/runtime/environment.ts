import type { RuntimeEnvironment, RuntimeOverrides } from "./types";
import type { RuntimeMode, WorkerCapability } from "../config/types/runtime";

const modes: readonly string[] = ["server", "worker", "all"];
const capabilities: readonly string[] = ["jobs", "events"];

export function parseRuntimeMode(value: string): RuntimeMode {
  const normalized = value.trim();
  if (!modes.includes(normalized)) {
    throw new Error(
      `Unknown runtime mode "${normalized}"; expected server, worker, or all`,
    );
  }
  return normalized as RuntimeMode;
}

export function normalizeWorkerCapabilities(
  values: readonly string[],
): WorkerCapability[] {
  const names = values.map((name) => name.trim()).filter(Boolean);
  for (const name of names) {
    if (!capabilities.includes(name)) {
      throw new Error(
        `Unknown worker capability "${name}"; expected jobs or events`,
      );
    }
  }
  return [...new Set(names)] as WorkerCapability[];
}

function parseWorkers(value: string): WorkerCapability[] {
  return normalizeWorkerCapabilities(value.split(","));
}

export function parseRuntimeEnvironment(
  environment: RuntimeEnvironment,
): RuntimeOverrides {
  const modeValue = environment.DAMAT_RUNTIME_MODE;
  const workersValue = environment.DAMAT_WORKER_TYPES;
  return {
    ...(modeValue !== undefined ? { mode: parseRuntimeMode(modeValue) } : {}),
    ...(workersValue !== undefined
      ? { workers: parseWorkers(workersValue) }
      : {}),
  };
}
