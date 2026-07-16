import type { SystemMigration } from "@damatjs/durability";
import { loadConfigModule } from "./configModule";
import { configFile, wrapLoadError } from "./path";

export async function loadSystemMigrations(
  configPath: string,
  cwd: string = process.cwd(),
): Promise<SystemMigration[]> {
  const filePath = configFile(configPath, cwd);
  try {
    const loaded = await loadConfigModule(filePath);
    const config = loaded.default ?? loaded;
    const jobsEnabled = Boolean(config.services?.jobs);
    const durableEventsEnabled = Boolean(config.services?.events?.durable);
    if (!jobsEnabled && !durableEventsEnabled) return [];
    const { collectSystemMigrations, durabilitySystemMigrations } =
      await import("@damatjs/durability");
    return collectSystemMigrations([durabilitySystemMigrations]);
  } catch (error) {
    wrapLoadError(error, `Failed to load system migrations from '${filePath}'`);
  }
}
