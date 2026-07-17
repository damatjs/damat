import type { AppConfig } from "../config/types";
import type { WorkerCapability } from "../config/types/runtime";
import {
  normalizeWorkerCapabilities,
  parseRuntimeEnvironment,
  parseRuntimeMode,
} from "./environment";
import type { ResolvedRuntime, RuntimeEnvironment } from "./types";

function enabledCapabilities(
  services: AppConfig["services"],
): WorkerCapability[] {
  return [
    ...(services?.jobs ? (["jobs"] as const) : []),
    ...(services?.events?.durable ? (["events"] as const) : []),
  ];
}

function validateAvailability(
  selected: WorkerCapability[],
  enabled: WorkerCapability[],
): void {
  const unavailable = selected.find((worker) => !enabled.includes(worker));
  if (unavailable) {
    throw new Error(
      `Worker capability "${unavailable}" is not enabled in services`,
    );
  }
}

export function resolveRuntime(
  config: Pick<AppConfig, "runtime" | "services">,
  environment: RuntimeEnvironment,
): ResolvedRuntime {
  const overrides = parseRuntimeEnvironment(environment);
  const enabled = enabledCapabilities(config.services);
  const mode = overrides.mode
    ? overrides.mode
    : parseRuntimeMode(config.runtime?.mode ?? "all");
  const configuredWorkers = config.runtime?.workers
    ? normalizeWorkerCapabilities(config.runtime.workers)
    : undefined;
  const selected = overrides.workers ?? configuredWorkers ?? enabled;
  if (mode === "server") {
    return { mode, workers: [], servesHttp: true };
  }
  validateAvailability(selected, enabled);
  if (mode === "worker" && selected.length === 0) {
    throw new Error("Worker runtime requires at least one enabled capability");
  }
  return {
    mode,
    workers: [...new Set(selected)],
    servesHttp: mode === "all",
  };
}
