import path from "node:path";
import fs from "node:fs";
import { resolveLinkMigrationModules } from "@damatjs/link";
import { OrmModuleContainer } from "../types";

export interface DatabaseConfig {
  databaseUrl: string;
}

/** Monotonic, per-process counter giving every load a distinct module identity. */
let sidecarCounter = 0;

async function loadConfigModule(filePath: string): Promise<any> {
  const contents = fs.readFileSync(filePath);
  const ext = path.extname(filePath);
  const sidecar = path.join(
    path.dirname(filePath),
    `.damat-config-${process.pid}-${sidecarCounter++}${ext}`,
  );

  try {
    fs.writeFileSync(sidecar, contents);
    return await import(`file://${sidecar}`);
  } finally {
    // The sidecar is a transient cache-busting artifact, not part of the
    // project, so remove it once it has been imported.
    try {
      fs.rmSync(sidecar, { force: true });
    } catch {
      // best-effort cleanup
    }
  }
}

/**
 * Builds a PostgreSQL connection URL from individual database config fields.
 */
function buildConnectionString(dbConfig: {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean | object;
}): string {
  const {
    host = "localhost",
    port = 5432,
    user = "postgres",
    password = "",
    database = "postgres",
    ssl,
  } = dbConfig;

  const encodedPassword = encodeURIComponent(password);
  const encodedDatabase = encodeURIComponent(database);

  let connectionString = `postgres://${user}:${encodedPassword}@${host}:${port}/${encodedDatabase}`;

  if (ssl) {
    const sslParam =
      typeof ssl === "boolean"
        ? "true"
        : encodeURIComponent(JSON.stringify(ssl));
    connectionString += `?ssl=${sslParam}`;
  }

  return connectionString;
}

/**
 * Load module configs from a damat.config.ts file.
 *
 * Reads the `modules` array from the config and converts it to a
 * `Record<id, { resolve: string }>` map where `resolve` is always an
 * absolute path resolved relative to the config file's directory.
 *
 * @param configPath - Absolute path to the config file, OR a filename/relative
 *                     path that will be joined with `cwd`.
 * @param cwd        - Working directory used when `configPath` is relative.
 *                     Defaults to `process.cwd()`.
 */
export async function loadModules<T = Record<string, { resolve: string }>>(
  configPath: string,
  cwd: string = process.cwd(),
): Promise<T> {
  const filePath = path.isAbsolute(configPath)
    ? configPath
    : path.join(cwd, configPath);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Config file not found: ${filePath}`);
  }

  // The directory that contains damat.config.ts — used to resolve relative
  // module paths like "./src/modules/user".
  const configDir = path.dirname(filePath);

  try {
    // Bust the module cache on every load so the CLI always reads the latest
    // version of the config file.
    const mod = await loadConfigModule(filePath);
    const config = mod.default ?? mod;

    const modules: OrmModuleContainer = {};

    for (const moduleName of Object.keys(config.modules)) {
      const module = config.modules[moduleName];
      const id: string = module.id ?? moduleName;
      const resolvedPath = path.isAbsolute(module.resolve)
        ? module.resolve
        : path.resolve(configDir, module.resolve);

      modules[id] = {
        id,
        resolve: resolvedPath,
        path: module.resolve,
        name: moduleName,
      };
    }

    // Each owner directory under config.links (src/links/<owner>) is its own
    // link migration module, so its junction tables get a dedicated
    // migrations/ folder that migrate:create / migrate:up pick up. Paths
    // resolve against the config directory, matching the modules above.
    for (const entry of resolveLinkMigrationModules(config.links, configDir)) {
      if (modules[entry.id]) continue; // never clobber a real module
      modules[entry.id] = {
        id: entry.id,
        resolve: entry.resolve,
        path: entry.path,
        name: entry.id,
        kind: "link",
      };
    }

    return modules as T;
  } catch (error) {
    // Re-throw our own "not found" errors untouched.
    if (
      error instanceof Error &&
      error.message.startsWith("Config file not found")
    ) {
      throw error;
    }
    const wrapped = new Error(`Failed to load config from '${filePath}'`);
    (wrapped as Error & { cause?: unknown }).cause = error;
    throw wrapped;
  }
}

/**
 * Load database URL from a damat.config.ts file.
 *
 * Reads `projectConfig.databaseUrl` first. If not found, falls back to
 * `services.database` config which can be either:
 * - A `connectionString` directly, or
 * - Individual fields (host, port, user, password, database, ssl) that
 *   will be used to build a connection string.
 *
 * @param configPath - Absolute path to the config file, OR a filename/relative
 *                     path that will be joined with `cwd`.
 * @param cwd        - Working directory used when `configPath` is relative.
 *                     Defaults to `process.cwd()`.
 */
export async function loadDatabaseUrl(
  configPath: string,
  cwd: string = process.cwd(),
): Promise<DatabaseConfig> {
  const filePath = path.isAbsolute(configPath)
    ? configPath
    : path.join(cwd, configPath);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Config file not found: ${filePath}`);
  }

  try {
    // Bust the module cache on every load so the CLI always reads the latest
    // version of the config file.
    const mod = await loadConfigModule(filePath);
    const config = mod.default ?? mod;

    // Try projectConfig.databaseUrl first
    if (config.projectConfig?.databaseUrl) {
      return { databaseUrl: config.projectConfig.databaseUrl };
    }

    // Try services.database config
    const dbConfig = config.services?.database;
    if (dbConfig) {
      // If connectionString is provided directly, use it
      if (dbConfig.connectionString) {
        return { databaseUrl: dbConfig.connectionString };
      }

      // Otherwise, build connection string from individual fields
      if (dbConfig.host || dbConfig.database) {
        const databaseUrl = buildConnectionString(dbConfig);
        return { databaseUrl };
      }
    }

    return { databaseUrl: "" };
  } catch (error) {
    // Re-throw our own "not found" errors untouched.
    if (
      error instanceof Error &&
      error.message.startsWith("Config file not found")
    ) {
      throw error;
    }
    const wrapped = new Error(`Failed to load database URL from '${filePath}'`);
    (wrapped as Error & { cause?: unknown }).cause = error;
    throw wrapped;
  }
}
