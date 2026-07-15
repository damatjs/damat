import type { ModuleManifest } from "@damatjs/module";
import type { ResolvedModuleSource } from "../helpers";

export interface AddState {
  resolved: ResolvedModuleSource;
  sourceModuleDir: string;
  manifest: ModuleManifest;
  moduleId: string;
  modulesDir: string;
  targetDir: string;
  relativeTarget: string;
  packages: Record<string, string>;
}
