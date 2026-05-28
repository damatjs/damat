import { getRedis } from "./client";
import { getSession, setSession, deleteSession, extendSession } from "./session";
import type { Redis } from "./types";

export interface SessionManagerOptions {
  defaultTtlSeconds: number;
  extendOnAccess: boolean;
  extendThreshold?: number;
}

const DEFAULT_OPTIONS: SessionManagerOptions = {
  defaultTtlSeconds: 3600,
  extendOnAccess: true,
  extendThreshold: 0.5,
};

export class SessionManager<T = unknown> {
  private options: SessionManagerOptions;
  private client: Redis | undefined;

  constructor(options?: Partial<SessionManagerOptions>, client?: Redis) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.client = client;
  }

  private getRedis(): Redis {
    return this.client ?? getRedis();
  }

  async get(token: string): Promise<T | null> {
    const session = await getSession<T>(token, this.getRedis());

    if (session && this.options.extendOnAccess) {
      await this.maybeExtend(token);
    }

    return session;
  }

  async set(token: string, data: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.options.defaultTtlSeconds;
    await setSession(token, data, ttl, this.getRedis());
  }

  async delete(token: string): Promise<void> {
    await deleteSession(token, this.getRedis());
  }

  async touch(token: string, ttlSeconds?: number): Promise<boolean> {
    const ttl = ttlSeconds ?? this.options.defaultTtlSeconds;
    return extendSession(token, ttl, this.getRedis());
  }

  async refresh(token: string, data: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.options.defaultTtlSeconds;
    await setSession(token, data, ttl, this.getRedis());
  }

  private async maybeExtend(token: string): Promise<void> {
    const redis = this.getRedis();
    const ttl = await redis.ttl(`session:${token}`);
    const threshold = this.options.extendThreshold!;
    const minTtl = Math.floor(this.options.defaultTtlSeconds * threshold);

    if (ttl > 0 && ttl < minTtl) {
      await extendSession(token, this.options.defaultTtlSeconds, redis);
    }
  }
}

export function createSessionManager<T = unknown>(
  options?: Partial<SessionManagerOptions>,
  client?: Redis,
): SessionManager<T> {
  return new SessionManager<T>(options, client);
}
