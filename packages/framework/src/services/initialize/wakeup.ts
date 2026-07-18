import {
  configureEventWakeupPublisher,
  type EventWakeupPublisher,
  type EventWakeupRedis,
} from "@damatjs/events";
import {
  configureJobWakeupPublisher,
  type JobWakeupPublisher,
  type JobWakeupRedis,
} from "@damatjs/jobs";
import type { AppConfig } from "../../config";
import {
  configurePipelineWakeupPublisher,
  type PipelineWakeupPublisher,
  type PipelineWakeupRedis,
} from "@damatjs/pipelines";
import { getRedis, hasRedis } from "../redis";

export type WorkerWakeupRedis = EventWakeupRedis &
  EventWakeupPublisher &
  JobWakeupRedis &
  JobWakeupPublisher &
  PipelineWakeupRedis &
  PipelineWakeupPublisher;

export function getWorkerWakeupRedis(
  config: AppConfig,
  getClient?: () => WorkerWakeupRedis,
  isAvailable?: () => boolean,
): WorkerWakeupRedis | undefined {
  if (!config.projectConfig.redisUrl) return undefined;
  if (config.services?.durability?.wakeups === false) return undefined;
  if (!(isAvailable ? isAvailable() : hasRedis())) return undefined;
  return getClient ? getClient() : (getRedis() as WorkerWakeupRedis);
}

export function configureWorkerWakeupPublishers(
  config: AppConfig,
  redis = getWorkerWakeupRedis(config),
): void {
  if (!redis) return;
  if (config.services?.jobs || config.services?.pipelines) {
    configureJobWakeupPublisher(redis);
  }
  if (config.services?.events?.durable) {
    configureEventWakeupPublisher(redis);
  }
  if (config.services?.pipelines) configurePipelineWakeupPublisher(redis);
}
