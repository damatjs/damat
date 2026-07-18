export const PIPELINE_WAKEUP_CHANNEL = "damat:pipelines:wakeup";

export interface PipelineWakeupMessage {
  kind: "pipelines";
  scope?: string;
}

export interface PipelineWakeupPublisher {
  publish(channel: string, message: string): Promise<unknown>;
}

export interface PipelineWakeupRedis extends PipelineWakeupPublisher {
  duplicate(): PipelineWakeupSubscriber;
}

export interface PipelineWakeupSubscriber {
  on(
    event: "message",
    listener: (channel: string, message: string) => void,
  ): void;
  off(
    event: "message",
    listener: (channel: string, message: string) => void,
  ): void;
  subscribe(channel: string): Promise<unknown>;
  unsubscribe(channel: string): Promise<unknown>;
  quit(): Promise<unknown>;
}
