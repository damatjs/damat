import { addModule } from "./add-module";
import { listInstalledTool } from "./list-installed";
import { listModules } from "./list-modules";
import { moduleInfo } from "./module-info";
import { searchModules } from "./search-modules";
import type { ToolDef } from "./types";

export type { ToolDef } from "./types";

/** The full tool catalog, in the order the assistant should usually chain them. */
export const tools: ToolDef[] = [
  listModules,
  searchModules,
  moduleInfo,
  listInstalledTool,
  addModule,
];
