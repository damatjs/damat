import type { DbPoolConfig } from '@damatjs/orm-type';
import type { RedisConfig } from '@damatjs/utils';
import type { ProjectConfig } from "./project";

export interface ModuleConfig {
  resolve: string;
  id?: string;
  options?: Record<string, unknown>;
}

export interface ServicesConfig {
  redis?: RedisConfig;
  database?: DbPoolConfig
  workflowLock?: boolean;
}


export interface AppConfig {
  projectConfig: ProjectConfig;
  modules?: ModuleConfig[];
  services?: ServicesConfig;
}
