import { getLogger } from "@damatjs/logger";
import type {
  EventContext,
  EventHandler,
  EventName,
  EventPayload,
  Unsubscribe,
} from "./types";

/**
 * How an EventBus hands emits to a cross-process transport (see
 * `broadcast.ts`). Kept as a narrow function type so the bus itself has no
 * Redis knowledge.
 */
export type Broadcaster = (event: string, payload: unknown) => Promise<void>;

/**
 * The subscription/event bus. In-process and synchronous to set up, async to
 * deliver:
 *
 * - `emit` awaits every subscriber (Promise.allSettled) — one failing
 *   handler never blocks the others and never throws back at the emitter
 *   (failures are logged with the event name).
 * - `on("*", handler)` subscribes to every event (audit/log fan-out).
 * - Delivery order per event is subscription order.
 */
export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private broadcaster: Broadcaster | null = null;

  // Explicit (empty) constructor: bun's coverage counts a class's implicit
  // constructor as a function that can never be marked hit, which would make
  // the package's 100% function-coverage gate unreachable.
  constructor() {}

  on<K extends EventName>(
    event: K,
    handler: EventHandler<EventPayload<K>>,
  ): Unsubscribe {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as EventHandler);
    return () => this.off(event, handler);
  }

  once<K extends EventName>(
    event: K,
    handler: EventHandler<EventPayload<K>>,
  ): Unsubscribe {
    const wrapped: EventHandler<EventPayload<K>> = async (payload, context) => {
      this.off(event, wrapped);
      await handler(payload, context);
    };
    return this.on(event, wrapped);
  }

  off<K extends EventName>(
    event: K,
    handler: EventHandler<EventPayload<K>>,
  ): void {
    const set = this.handlers.get(event);
    if (!set) return;
    set.delete(handler as EventHandler);
    if (set.size === 0) this.handlers.delete(event);
  }

  removeAllListeners(event?: string): void {
    if (event === undefined) this.handlers.clear();
    else this.handlers.delete(event);
  }

  listenerCount(event: string): number {
    return (
      (this.handlers.get(event)?.size ?? 0) +
      (this.handlers.get("*")?.size ?? 0)
    );
  }

  /**
   * Deliver to every subscriber of the event (plus `*` subscribers) and,
   * when a broadcast transport is connected, publish for other processes.
   * Resolves after all local handlers settled; returns how many ran.
   */
  async emit<K extends EventName>(
    event: K,
    payload: EventPayload<K>,
  ): Promise<number> {
    const delivered = await this.dispatch(event, payload, "local");
    if (this.broadcaster) {
      try {
        await this.broadcaster(event, payload);
      } catch (e) {
        getLogger().error(
          `Event broadcast failed for "${event}" — local subscribers already ran`,
          e instanceof Error ? e : new Error(String(e)),
        );
      }
    }
    return delivered;
  }

  /** Local-only delivery — used by the broadcast transport for remote events. */
  async dispatch(
    event: string,
    payload: unknown,
    source: EventContext["source"],
  ): Promise<number> {
    const direct = this.handlers.get(event);
    const wildcard = event === "*" ? undefined : this.handlers.get("*");
    const targets = [...(direct ?? []), ...(wildcard ?? [])];
    if (targets.length === 0) return 0;

    const context: EventContext = { event, emittedAt: new Date(), source };
    const results = await Promise.allSettled(
      targets.map((h) => h(payload, context)),
    );
    for (const result of results) {
      if (result.status === "rejected") {
        getLogger().error(
          `Event subscriber for "${event}" failed`,
          result.reason instanceof Error
            ? result.reason
            : new Error(String(result.reason)),
        );
      }
    }
    return targets.length;
  }

  /** Attach/detach the cross-process transport (null disconnects). */
  setBroadcaster(broadcaster: Broadcaster | null): void {
    this.broadcaster = broadcaster;
  }

  /** True when a cross-process transport is attached. */
  get broadcasting(): boolean {
    return this.broadcaster !== null;
  }
}
