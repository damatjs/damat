/**
 * Redis Module - Session Manager with Auto-Keep-Alive
 *
 * A wrapper that automatically extends session TTL on access,
 * keeping the session alive as long as the user is active.
 */

import type { Redis } from "../src/types";
import { getSession, setSession, deleteSession, extendSession } from "../src/session";

export interface SessionManagerOptions {
  defaultTtlSeconds: number;
  extendOnAccess: boolean;
  autoExtendThreshold?: number;
}

const DEFAULT_OPTIONS: SessionManagerOptions = {
  defaultTtlSeconds: 3600,
  extendOnAccess: true,
  autoExtendThreshold: 0.5,
};

export class SessionManager<T = unknown> {
  private client: Redis;
  private options: SessionManagerOptions;

  constructor(client: Redis, options?: Partial<SessionManagerOptions>) {
    this.client = client;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async get(token: string): Promise<T | null> {
    const session = await getSession<T>(this.client, token);

    if (session && this.options.extendOnAccess) {
      await this.maybeExtend(token);
    }

    return session;
  }

  async set(token: string, data: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.options.defaultTtlSeconds;
    await setSession(this.client, token, data, ttl);
  }

  async delete(token: string): Promise<void> {
    await deleteSession(this.client, token);
  }

  async touch(token: string, ttlSeconds?: number): Promise<boolean> {
    const ttl = ttlSeconds ?? this.options.defaultTtlSeconds;
    return extendSession(this.client, token, ttl);
  }

  async refresh(token: string, data: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.options.defaultTtlSeconds;
    await setSession(this.client, token, data, ttl);
  }

  private async maybeExtend(token: string): Promise<void> {
    const ttl = await this.client.ttl(`session:${token}`);
    const threshold = this.options.autoExtendThreshold!;
    const minTtl = Math.floor(this.options.defaultTtlSeconds * threshold);

    if (ttl > 0 && ttl < minTtl) {
      await extendSession(this.client, token, this.options.defaultTtlSeconds);
    }
  }
}

export function createSessionManager<T = unknown>(
  client: Redis,
  options?: Partial<SessionManagerOptions>,
): SessionManager<T> {
  return new SessionManager<T>(client, options);
}
