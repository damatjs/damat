import type { DbPoolConfig } from '@damatjs/orm-type';
import type { RedisConfig } from '@damatjs/utils';

export interface ServicesConfig {
  redis?: RedisConfig;
  database?: DbPoolConfig
  workflowLock?: boolean;
}

