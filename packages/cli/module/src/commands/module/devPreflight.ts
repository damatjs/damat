import type { CommandContext } from "@damatjs/cli";
import {
  assertModuleDatabaseConfigured,
  assertServerPortAvailable,
  resolveModuleRuntimePlan,
  type ModuleRuntimePlan,
} from "@damatjs/module";
import { ensurePostgresDatabase } from "@damatjs/orm-cli";

interface PreflightDependencies {
  resolve: typeof resolveModuleRuntimePlan;
  assertPort: typeof assertServerPortAvailable;
  assertDatabase: typeof assertModuleDatabaseConfigured;
  ensure: typeof ensurePostgresDatabase;
}

const defaultDependencies: PreflightDependencies = {
  resolve: resolveModuleRuntimePlan,
  assertPort: assertServerPortAvailable,
  assertDatabase: assertModuleDatabaseConfigured,
  ensure: ensurePostgresDatabase,
};

export async function preflightModuleDev(
  cwd: string,
  port: number | undefined,
  logger: CommandContext["logger"],
  dependencies: PreflightDependencies = defaultDependencies,
): Promise<ModuleRuntimePlan> {
  const { loadEnv } = await import("@damatjs/load-env");
  loadEnv(process.env.NODE_ENV || "development", cwd);
  const plan = await dependencies.resolve({
    packageDir: cwd,
    ...(port !== undefined ? { port } : {}),
  });
  const http = plan.config.projectConfig.http;
  await dependencies.assertPort(http.port, http.host ?? "0.0.0.0");
  dependencies.assertDatabase(plan);
  if (!plan.capabilities.requiresDatabase) return plan;
  const result = await dependencies.ensure(
    plan.config.projectConfig.databaseUrl!,
  );
  logger[result.created ? "success" : "info"](
    result.created
      ? "Module PostgreSQL database created"
      : "Module PostgreSQL database already exists",
  );
  return plan;
}
