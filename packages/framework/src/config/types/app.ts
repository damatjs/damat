import { ModuleConfigObject } from './module';
import type { ProjectConfig } from "./project";
import { ServicesConfig } from './services';

export interface AppConfig {
  projectConfig: ProjectConfig;
  modules?: ModuleConfigObject;
  /**
   * Cross-module links. A path (or paths) to a directory whose `index.ts`
   * default-exports `defineLinkModule(...)` and exports `models` — typically
   * `"./src/links"`. The directory is registered as a `link` module so it
   * participates in boot, migrations, and type generation automatically.
   */
  links?: string | string[];
  services?: ServicesConfig;
}
