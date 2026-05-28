import type { DbPoolConfig } from '@damatjs/orm-type';
import type { RedisConfig } from '../../services/redis';

export interface ServicesConfig {
  redis?: RedisConfig;
  database?: DbPoolConfig
  workflowLock?: boolean;
}

