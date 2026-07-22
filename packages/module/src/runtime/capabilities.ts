import { existsSync } from "node:fs";
import { join } from "node:path";
import type { WorkerCapability } from "@damatjs/framework";
import {
  DEFAULT_MODULE_PATHS,
  type ModuleManifest,
  type ModuleManifestPaths,
} from "../manifest/types";

export interface ModuleRuntimeCapabilities {
  models: boolean;
  migrations: boolean;
  jobs: boolean;
  events: boolean;
  pipelines: boolean;
  durable: boolean;
  requiresDatabase: boolean;
  workers: WorkerCapability[];
}

type Capability = "models" | "migrations" | "jobs" | "events" | "pipelines";

function provides(
  moduleDir: string,
  manifest: ModuleManifest,
  capability: Capability,
): boolean {
  const declared = manifest.paths?.[capability];
  if (declared !== undefined) return true;
  const fallback =
    DEFAULT_MODULE_PATHS[capability as keyof ModuleManifestPaths];
  return Boolean(fallback && existsSync(join(moduleDir, fallback)));
}

export function detectModuleCapabilities(
  moduleDir: string,
  manifest: ModuleManifest,
): ModuleRuntimeCapabilities {
  const models = provides(moduleDir, manifest, "models");
  const migrations = provides(moduleDir, manifest, "migrations");
  const jobs = provides(moduleDir, manifest, "jobs");
  const events = provides(moduleDir, manifest, "events");
  const pipelines = provides(moduleDir, manifest, "pipelines");
  const durable = jobs || events || pipelines;
  return {
    models,
    migrations,
    jobs,
    events,
    pipelines,
    durable,
    requiresDatabase: models || migrations || durable,
    workers: [
      ...(jobs ? (["jobs"] as const) : []),
      ...(events ? (["events"] as const) : []),
      ...(pipelines ? (["pipelines"] as const) : []),
    ],
  };
}
