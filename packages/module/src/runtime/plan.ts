import type { AppConfig } from "@damatjs/framework";
import { loadModuleConfig } from "../config/load";
import type { ModuleAppConfig } from "../config/types";
import { readModuleManifest } from "../manifest/read";
import type { ModuleManifest } from "../manifest/types";
import { buildModuleAppConfig } from "./appConfig";
import {
  detectModuleCapabilities,
  type ModuleRuntimeCapabilities,
} from "./capabilities";
import { locateModuleDir } from "./locate";
import type { StartModuleAppOptions } from "./types";

export class ModuleDatabaseRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModuleDatabaseRequiredError";
  }
}

export interface ModuleRuntimePlan {
  packageDir: string;
  moduleDir: string;
  manifest: ModuleManifest;
  moduleConfig: ModuleAppConfig;
  capabilities: ModuleRuntimeCapabilities;
  config: AppConfig;
  routeBasePath: string;
}

export async function resolveModuleRuntimePlan(
  options: StartModuleAppOptions = {},
): Promise<ModuleRuntimePlan> {
  const packageDir = options.packageDir ?? process.cwd();
  const moduleDir = locateModuleDir(packageDir);
  const manifest = readModuleManifest(moduleDir);
  const moduleConfig = await loadModuleConfig(packageDir);
  const capabilities = detectModuleCapabilities(moduleDir, manifest);
  const config = buildModuleAppConfig({
    moduleDir,
    manifest,
    moduleConfig,
    capabilities,
    ...(options.port !== undefined ? { port: options.port } : {}),
  });
  return {
    packageDir,
    moduleDir,
    manifest,
    moduleConfig,
    capabilities,
    config,
    routeBasePath: config.projectConfig.http.api?.entryRouter ?? "/api",
  };
}

export function assertModuleDatabaseConfigured(plan: ModuleRuntimePlan): void {
  if (!plan.capabilities.requiresDatabase) return;
  if (plan.config.projectConfig.databaseUrl) return;
  const names: string[] = [];
  const databaseCapabilities = [
    "models",
    "migrations",
    "jobs",
    "events",
    "pipelines",
  ] as const;
  for (const name of databaseCapabilities) {
    if (plan.capabilities[name]) names.push(name);
  }
  throw new ModuleDatabaseRequiredError(
    `Module "${plan.manifest.name}" declares ${names.join(", ")} and requires PostgreSQL. ` +
      "Set DATABASE_URL in .env before running damat module dev.",
  );
}
