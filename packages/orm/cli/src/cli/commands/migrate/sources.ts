import type { OrmModule } from "@/cli/types";

export function migrationSources(
  modules: OrmModule[],
): Array<string | Pick<OrmModule, "resolve" | "migrations">> {
  return modules.map((module) =>
    module.migrations
      ? { resolve: module.resolve, migrations: module.migrations }
      : module.resolve,
  );
}
