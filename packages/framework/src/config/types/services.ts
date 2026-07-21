import type { DbPoolConfig } from "@damatjs/orm-type";
import type { RedisConfig } from "../../services/redis";
import type { DurabilityServiceConfig } from "./durability";
import type { EventsServiceConfig } from "./events";
import type { JobsServiceConfig } from "./jobs";
import type { PipelinesServiceConfig } from "./pipelines";
export interface ServicesConfig {
  redis?: RedisConfig;
  database?: DbPoolConfig;
  workflowLock?: boolean;
  durability?: DurabilityServiceConfig;
  events?: EventsServiceConfig;
  jobs?: JobsServiceConfig;
  pipelines?: PipelinesServiceConfig;
}
