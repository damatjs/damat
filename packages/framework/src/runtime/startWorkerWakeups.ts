import {
  clearAccelerationController,
  configureAccelerationController,
} from "@damatjs/durability";
import type { ILogger } from "@damatjs/logger";
import type { Redis } from "@damatjs/redis";
import type { AppConfig } from "../config";
import { AccelerationRelay } from "../services/initialize/accelerationRelay";
import {
  WorkerWakeupTransport,
} from "../services/initialize/wakeupTransport";
import type { WakeupTargets } from "../services/initialize/wakeupTargets";
import { getRedis } from "../services/redis";
import type { ServiceInstances } from "../services/types";

export function startWorkerWakeups(
  config: AppConfig,
  instances: ServiceInstances,
  logger: ILogger,
  targets: WakeupTargets,
  redis?: Redis,
): void {
  const coordinator = instances.durabilityCoordinator;
  const acceleration = config.services?.durability?.acceleration;
  const disabled = acceleration
    ? acceleration.enabled === false
    : config.services?.durability?.wakeups === false;
  if (!coordinator || !config.projectConfig.redisUrl || disabled) return;
  const client = redis ?? getRedis();
  let transport!: WorkerWakeupTransport;
  const relay = new AccelerationRelay(
    client,
    acceleration?.relayBatchSize ?? 100,
    acceleration?.healthySafetyPollIntervalMs ?? 30_000,
    {
      jobs: Boolean(config.services?.jobs),
      events: Boolean(config.services?.events?.durable),
    },
    coordinator,
    (error) => void transport.markDegraded(error),
  );
  transport = new WorkerWakeupTransport(
    client,
    coordinator,
    targets,
    logger,
    acceleration?.workerLivenessTtlMs ?? 10_000,
    async () => {
      await relay.rebuild({
        id: "framework-startup",
        type: "system",
        reason: "Redis acceleration connected",
      });
      relay.start();
    },
    () => relay.stop(),
    redisUsername(config.projectConfig.redisUrl),
  );
  configureAccelerationController(relay);
  transport.start();
  instances.shutdownHandlers.push({
    name: "durability-redis-acceleration",
    phase: "claims",
    handler: async () => {
      relay.stop();
      clearAccelerationController();
      await transport.stop();
    },
  });
}

export function redisUsername(redisUrl: string): string {
  try {
    return decodeURIComponent(new URL(redisUrl).username) || "default";
  } catch {
    return "unknown";
  }
}
