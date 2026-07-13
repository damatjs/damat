import { Redis } from "@damatjs/deps/ioredis";
import type { RedisClientConfig } from "./types";
import { createRedisConnection } from "./client/factory";
import { CONSOLE_LOGGER } from "./client/consoleLogger";
import { ILogger } from '@damatjs/logger';

export class RedisClient {
  private readonly redis: Redis;
  private readonly logger: ILogger;
  private readonly name: string;
  private readonly debug: boolean;
  private connected = false;

  constructor(config: RedisClientConfig) {
    this.redis = createRedisConnection(config);
    this.logger = config.logger ?? CONSOLE_LOGGER;
    this.name = config.name ?? "default";
    this.debug = config.debug ?? false;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on("error", (err: Error) => {
      this.logger.error("Redis connection error", err, { name: this.name });
    });

    this.redis.on("connect", () => {
      this.connected = true;
      this.logger.info("Redis connected", { name: this.name });
    });

    this.redis.on("close", () => {
      this.connected = false;
      this.logger.warn("Redis connection closed", { name: this.name });
    });

    this.redis.on("reconnecting", () => {
      if (this.debug) {
        this.logger.debug("Redis reconnecting", { name: this.name });
      }
    });
  }

  get client(): Redis {
    return this.redis;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<void> {
    await this.redis.connect();
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
    this.connected = false;
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === "PONG";
    } catch {
      return false;
    }
  }
}
