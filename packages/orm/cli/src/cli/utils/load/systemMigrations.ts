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
    const pipelinesEnabled = Boolean(config.services?.pipelines);
    if (!jobsEnabled && !durableEventsEnabled && !pipelinesEnabled) return [];
    const { collectSystemMigrations, durabilitySystemMigrations } =
      await import("@damatjs/durability");
    const catalogs = [durabilitySystemMigrations];
    if (jobsEnabled || pipelinesEnabled) {
      const { jobsSystemMigrations } = await import("@damatjs/jobs/migrations");
      catalogs.push(jobsSystemMigrations);
    }
    if (durableEventsEnabled) {
      const { eventsSystemMigrations } =
        await import("@damatjs/events/migrations");
      catalogs.push(eventsSystemMigrations);
    }
    if (pipelinesEnabled) {
      const { pipelinesSystemMigrations } =
        await import("@damatjs/pipelines/migrations");
      catalogs.push(pipelinesSystemMigrations);
    }
    return collectSystemMigrations(catalogs);
  } catch (error) {
    wrapLoadError(error, `Failed to load system migrations from '${filePath}'`);
  }
}
