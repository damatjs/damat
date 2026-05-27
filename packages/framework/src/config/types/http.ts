import { CorsConfigType } from '../../middleware/corsConfig';
import type { AuthType, } from '../../router/types';

export interface HttpConfig {
  port: number;
  host: string;
  corsConfig?: string | CorsConfigType | undefined;
  api?: {
    bathUrl?: string | undefined;
    entryRouter?: string | undefined;
    entryRouterPath?: string | undefined;
    healthCheckRouter?: string | undefined;
  };
  rateLimit?: HttpRateLimitConfig;
  auth?: HttpAuthConfig;
}

export interface HttpRateLimitConfig {
  requests: number;
  window: string;
  getUserTier?: ((userId: string) => Promise<HttpRateLimitConfig | null>) | undefined;
  getApiKeyTier?: ((apiKey: string) => Promise<HttpRateLimitConfig | null>) | undefined;
}

export interface HttpAuthConfig {
  type: AuthType;
}