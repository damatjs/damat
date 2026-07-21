import { ConnectionManager } from "@damatjs/orm-connector";
import { PoolManager } from "@damatjs/services";
import { Logger } from "@damatjs/logger";
import { readModuleManifest } from "../manifest/read";
import type { ModuleManifest } from "../manifest/types";
import { resolveDatabaseConfig } from "./database";
import { applyModuleMigrations } from "./migrate";
import type { BootableModule, BootModuleOptions, BootedModule } from "./types";

/**
 * Boot a module standalone — no backend app required.
 *
 * Wires the same infrastructure the framework uses in production
 * (ConnectionManager + PoolManager), optionally applies the module's own
 * migrations, and initializes the module. This is what makes a module
 * developable and testable in its own repository before it's ever added
 * to a backend.
 *
 * @example
 * ```ts
 * import { bootModule } from "@damatjs/module";
 * import userModule from "./index";
 *
 * const booted = await bootModule(userModule, {
 *   moduleDir: import.meta.dir,
 * });
 * const user = await booted.service.user.create({ data: { email } });
 * await booted.teardown();
 * ```
 */
export async function bootModule<TService extends object>(
  module: BootableModule<TService>,
  options: BootModuleOptions = {},
): Promise<BootedModule<TService>> {
  const logger =
    options.logger ?? new Logger({ prefix: "module", timestamp: false });

  const dbConfig = resolveDatabaseConfig(options);
  const connection = new ConnectionManager(dbConfig, logger);
  const pool = await connection.connect();

  // Fresh shared state for this boot — the harness owns the process
  PoolManager.reset();
  PoolManager.setup({ pool, logger, connectionManager: connection });

  let manifest: ModuleManifest | null = null;
  if (options.moduleDir) {
    manifest = readModuleManifest(options.moduleDir);
    await applyModuleMigrations(
      pool,
      options.moduleDir,
      manifest,
      logger,
      options.migrate,
    );
  }

  module.init();

  return {
    service: module.service,
    pool,
    connection,
    manifest,
    teardown: async () => {
      PoolManager.reset();
      await connection.disconnect();
    },
  };
}
