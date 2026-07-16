export interface JobWakeup {
  kind: "jobs";
  queue: string;
}

export interface JobWakeupPublisher {
  publish(channel: string, message: string): Promise<number>;
}

export interface JobWakeupConnection {
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

export interface JobWakeupRedis {
  duplicate(): JobWakeupConnection;
}

export type StopJobWakeupSubscriber = () => Promise<void>;
