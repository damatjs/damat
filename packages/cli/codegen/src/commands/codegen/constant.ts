import { join } from "node:path";

export type ModuleEntry = {
  resolve: string;
  entry?: string;
  models?: string;
  migrations?: string;
  mutable?: boolean;
  packageName?: string;
  kind?: string;
};
export type ModuleContainer = Record<string, ModuleEntry>;

export const modelsPath = (module: ModuleEntry) =>
  module.models ?? join(module.resolve, "models");
export const entryPath = (module: ModuleEntry) =>
  module.entry ?? module.resolve;
export const typesPath = (
  module: ModuleEntry,
  cwd: string,
  moduleId: string,
) =>
  module.mutable === false
    ? join(cwd, "src", "modules", moduleId, "types")
    : join(module.resolve, "types");
