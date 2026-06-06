import { ModuleConfigObject } from './module';
import type { ProjectConfig } from "./project";
import { ServicesConfig } from './services';

export interface AppConfig {
  projectConfig: ProjectConfig;
  modules?: ModuleConfigObject;
  services?: ServicesConfig;
}
