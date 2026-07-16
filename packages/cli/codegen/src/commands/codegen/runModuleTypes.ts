import type { CliLogger } from "@damatjs/cli";
import type { ModuleContainer, ModuleEntry } from "./constant";

export type ModuleCodegenOutcome = "generated" | "skipped" | "error";

export interface RunModuleCodegenArgs {
  modules: ModuleContainer;
  moduleName: string;
  moduleConfig: ModuleEntry;
  cwd: string;
  flat: boolean;
  logger: CliLogger;
  strict: boolean;
}
