import type { Redis } from "@damatjs/redis";

type MessageListener = (channel: string, message: string) => void;

export class FakeWakeupRedis {
  duplicates = 0;
  published: Array<[string, string]> = [];
  listener?: MessageListener;
  subscribeError?: Error;
  publishError?: Error;
  setError?: Error;

  duplicate(): Redis {
    this.duplicates += 1;
    return {
      on: (_event: string, listener: MessageListener) => {
        this.listener = listener;
      },
      off: () => void (this.listener = undefined),
      subscribe: async () => {
        if (this.subscribeError) throw this.subscribeError;
        return 2;
      },
      unsubscribe: async () => 0,
      quit: async () => "OK",
    } as unknown as Redis;
  }

  async publish(channel: string, message: string): Promise<number> {
    if (this.publishError) throw this.publishError;
    this.published.push([channel, message]);
    return 1;
  }

  async set(): Promise<"OK"> {
    if (this.setError) throw this.setError;
    return "OK";
  }

  async del(): Promise<number> {
    return 1;
  }

  async scan(): Promise<[string, string[]]> {
    return ["0", []];
  }

  async zadd(): Promise<number> {
    return 1;
  }

  emit(channel: string, message: unknown): void {
    this.listener?.(channel, JSON.stringify(message));
  }
}
