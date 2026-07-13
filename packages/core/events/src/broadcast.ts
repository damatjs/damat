import { randomUUID } from "node:crypto";
import { getLogger } from "@damatjs/logger";
import { getRedisClient } from "@damatjs/redis";
import type { Redis } from "@damatjs/redis";
import { getEventBus } from "./global";

/** One pub/sub channel carries every event; the envelope names it. */
const DEFAULT_CHANNEL = "damat-events";

interface BroadcastEnvelope {
  instanceId: string;
  event: string;
  payload: unknown;
  emittedAt: string;
}

interface BroadcastState {
  subscriber: Redis;
  channel: string;
}

let state: BroadcastState | null = null;

export interface BroadcastOptions {
  /** Pub/sub channel name (default "damat-events"). */
  channel?: string;
}

/**
 * Connect the global bus to Redis pub/sub so events reach every process
 * sharing the Redis. Opt-in and additive: local delivery is unchanged;
 * remote deliveries arrive with `context.source === "remote"`.
 *
 * A subscribed ioredis connection can't run other commands, so the transport
 * duplicates the singleton client for its subscriber — call
 * `disconnectEventBroadcast()` on shutdown to close it.
 */
export async function connectEventBroadcast(
  options: BroadcastOptions = {},
): Promise<void> {
  if (state) return; // already connected — idempotent

  const channel = options.channel ?? DEFAULT_CHANNEL;
  const instanceId = randomUUID();
  const publisher = getRedisClient().client;
  const subscriber = publisher.duplicate();

  await subscriber.subscribe(channel);
  subscriber.on("message", (_channel: string, raw: string) => {
    let envelope: BroadcastEnvelope;
    try {
      envelope = JSON.parse(raw) as BroadcastEnvelope;
    } catch {
      getLogger().warn("Dropped malformed event broadcast message");
      return;
    }
    // Redis delivers our own publishes back to us — local subscribers
    // already ran, so self-messages are skipped instead of double-delivered.
    if (envelope.instanceId === instanceId) return;
    void getEventBus().dispatch(envelope.event, envelope.payload, "remote");
  });

  getEventBus().setBroadcaster(async (event, payload) => {
    const envelope: BroadcastEnvelope = {
      instanceId,
      event,
      payload,
      emittedAt: new Date().toISOString(),
    };
    await publisher.publish(channel, JSON.stringify(envelope));
  });

  state = { subscriber, channel };
  getLogger().info("Event broadcast connected", { channel });
}

/** Detach the transport and close the dedicated subscriber connection. */
export async function disconnectEventBroadcast(): Promise<void> {
  if (!state) return;
  getEventBus().setBroadcaster(null);
  try {
    await state.subscriber.unsubscribe(state.channel);
    await state.subscriber.quit();
  } catch (e) {
    getLogger().debug(
      `Event broadcast subscriber close failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  state = null;
}

/** True while the transport is connected. */
export function isEventBroadcastConnected(): boolean {
  return state !== null;
}
