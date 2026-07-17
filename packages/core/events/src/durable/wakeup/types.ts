export type EventWakeup =
  | { kind: "events"; target: "router" }
  | {
      kind: "events";
      target: "delivery";
      event: string;
      consumer: string;
    };

export interface EventWakeupPublisher {
  publish(channel: string, message: string): Promise<number>;
}

export interface EventWakeupConnection {
  subscribe(channel: string): Promise<unknown>;
  unsubscribe(channel: string): Promise<unknown>;
  quit(): Promise<unknown>;
  on(
    event: "message",
    listener: (channel: string, message: string) => void,
  ): unknown;
  off(
    event: "message",
    listener: (channel: string, message: string) => void,
  ): unknown;
}

export interface EventWakeupRedis {
  duplicate(): EventWakeupConnection;
}

export type StopEventWakeupSubscriber = () => Promise<void>;
