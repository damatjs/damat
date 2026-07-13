import { ModuleConfigObject } from './module';
import type { ProjectConfig } from "./project";
import { ServicesConfig } from './services';
import type { LifecycleHooks } from './hooks';

export interface AppConfig {
  projectConfig: ProjectConfig;
  modules?: ModuleConfigObject;
  /** Optional bootstrap lifecycle hooks — see LifecycleHooks for the stages. */
  hooks?: LifecycleHooks;
  /**
   * Cross-module links. A path (or paths) to a directory whose `index.ts`
   * default-exports `defineLinkModule(...)` and exports `models` — typically
   * `"./src/links"`. The directory is registered as a `link` module so it
   * participates in boot, migrations, and type generation automatically.
   */
  links?: string | string[];
  services?: ServicesConfig;
}
