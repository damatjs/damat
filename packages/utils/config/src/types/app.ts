import type { ProjectConfig } from "./project";

export interface ModuleConfig {
  resolve: string;
  id?: string;
  options?: Record<string, unknown>;
}

export interface AppConfig {
  projectConfig: ProjectConfig;
  modules?: ModuleConfig[];
}
