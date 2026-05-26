import type { ProjectConfig } from "./project";

export interface ModuleConfig {
  resolve: string;
  id?: string;
  options?: Record<string, unknown>;
}

export interface ServicesConfig {
  redis?: {
    enabled?: boolean;
    url?: string;
  };
  workflowLock?: boolean;
}

export interface AppConfig {
  projectConfig: ProjectConfig;
  modules?: ModuleConfig[];
  services?: ServicesConfig;
}
