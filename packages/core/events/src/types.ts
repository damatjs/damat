/**
 * The app-wide event map. Empty here by design — apps and modules add their
 * events via declaration merging, and every `on`/`emit` becomes fully typed:
 *
 * ```ts
 * declare module "@damatjs/events" {
 *   interface EventMap {
 *     "user.created": { id: string; email: string };
 *     "invoice.paid": { invoiceId: string; amount: number };
 *   }
 * }
 * ```
 *
 * Unregistered event names still work (payload typed `unknown`) so the bus
 * never blocks ad-hoc use.
 */
export interface EventMap {}

/** A registered event name, or any string for unregistered ad-hoc events. */
export type EventName = (keyof EventMap & string) | (string & {});

/** The payload type for an event (unknown when not in the EventMap). */
export type EventPayload<K extends string> = K extends keyof EventMap
  ? EventMap[K]
  : unknown;

/** Delivery metadata handed to every subscriber alongside the payload. */
export interface EventContext {
  event: string;
  emittedAt: Date;
  /** "local" for in-process emits, "remote" when delivered via broadcast. */
  source: "local" | "remote";
}

export type EventHandler<T = unknown> = (
  payload: T,
  context: EventContext,
) => void | Promise<void>;

/** Unsubscribe function returned by `on`/`once`. */
export type Unsubscribe = () => void;
