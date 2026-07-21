import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { resolveLinkMigrationModules } from "@damatjs/link";
import { resolveModuleArtifact } from "@damatjs/installer";
import type { OrmModuleContainer } from "../../types";
import { loadConfigModule } from "./configModule";
import { configFile, wrapLoadError } from "./path";

function displayPath(resolve: unknown): string {
  if (typeof resolve === "string") return resolve;
  const location = resolve as { type?: string; name?: string; path?: string };
  return location.type === "package"
    ? (location.name ?? "")
    : (location.path ?? "");
}

interface LoadedModule {
  root: string;
  entry?: string;
  models?: string;
  migrations?: string;
  mutable: boolean;
  packageName?: string;
}

function resolveModule(
  module: any,
  configDir: string,
  id: string,
): LoadedModule {
  const sourceRoot =
    typeof module.resolve === "string"
      ? resolve(configDir, module.resolve)
      : undefined;
  try {
    return resolveModuleArtifact(module.resolve, configDir, id);
  } catch (error) {
    if (!sourceRoot || existsSync(sourceRoot)) throw error;
    return {
      root: sourceRoot,
      mutable: true,
    };
  }
}

export async function loadModules<T = OrmModuleContainer>(
  configPath: string,
  cwd: string = process.cwd(),
): Promise<T> {
  const filePath = configFile(configPath, cwd);
  const configDir = dirname(filePath);
  try {
    const loaded = await loadConfigModule(filePath);
    const config = loaded.default ?? loaded;
    if (!config.modules || typeof config.modules !== "object")
      throw new Error("config.modules must be an object");
    const modules: OrmModuleContainer = {};
    for (const [name, module] of Object.entries<any>(config.modules ?? {})) {
      const id = module.id ?? name;
      const resolved = resolveModule(module, configDir, id);
      modules[id] = {
        id,
        name,
        path: displayPath(module.resolve),
        resolve: resolved.root,
        ...(resolved.entry && { entry: resolved.entry }),
        ...(resolved.models && { models: resolved.models }),
        ...(resolved.migrations && { migrations: resolved.migrations }),
        ...(resolved.mutable === false && { mutable: false }),
        ...(resolved.packageName && { packageName: resolved.packageName }),
      };
    }
    for (const entry of resolveLinkMigrationModules(config.links, configDir)) {
      if (modules[entry.id]) continue;
      modules[entry.id] = {
        id: entry.id,
        name: entry.id,
        path: entry.path,
        resolve: entry.resolve,
        entry: entry.resolve,
        migrations: `${entry.resolve}/migrations`,
        mutable: true,
        kind: "link",
      };
    }
    return modules as T;
  } catch (error) {
    wrapLoadError(error, `Failed to load config from '${filePath}'`);
  }
}
