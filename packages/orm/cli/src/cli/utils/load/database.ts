import { loadConfigModule } from "./configModule";
import { configFile, wrapLoadError } from "./path";

export interface DatabaseConfig {
  databaseUrl: string;
}

function connectionString(config: Record<string, any>): string {
  const host = config.host ?? "localhost";
  const port = config.port ?? 5432;
  const user = config.user ?? "postgres";
  const password = encodeURIComponent(config.password ?? "");
  const database = encodeURIComponent(config.database ?? "postgres");
  let value = `postgres://${user}:${password}@${host}:${port}/${database}`;
  if (config.ssl) {
    const ssl =
      typeof config.ssl === "boolean"
        ? "true"
        : encodeURIComponent(JSON.stringify(config.ssl));
    value += `?ssl=${ssl}`;
  }
  return value;
}

export async function loadDatabaseUrl(
  configPath: string,
  cwd: string = process.cwd(),
): Promise<DatabaseConfig> {
  const filePath = configFile(configPath, cwd);
  try {
    const loaded = await loadConfigModule(filePath);
    const config = loaded.default ?? loaded;
    if (config.projectConfig?.databaseUrl)
      return { databaseUrl: config.projectConfig.databaseUrl };
    const database = config.services?.database;
    if (database?.connectionString)
      return { databaseUrl: database.connectionString };
    if (database?.host || database?.database)
      return { databaseUrl: connectionString(database) };
    return { databaseUrl: "" };
  } catch (error) {
    wrapLoadError(error, `Failed to load database URL from '${filePath}'`);
  }
}
