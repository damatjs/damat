import { CorsConfigType } from '../../middleware/corsConfig';

export interface HttpConfig {
  port: number;
  host: string;
  corsConfig?: string | CorsConfigType | undefined;
  api?: {
    bathUrl?: string | undefined;
    entryRouter?: string | undefined;
    entryRouterPath?: string | undefined;
    healthCheckRouter?: string | undefined;
  }
}
