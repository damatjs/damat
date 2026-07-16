import type { JobWakeupConnection, JobWakeupRedis } from "../../src/wakeup";

export class FakeWakeupConnection implements JobWakeupConnection {
  subscribed?: string;
  stopped = false;
  private listener?: (channel: string, message: string) => void;

  async subscribe(channel: string): Promise<number> {
    this.subscribed = channel;
    return 1;
  }

  async unsubscribe(): Promise<number> {
    this.subscribed = undefined;
    return 0;
  }

  async quit(): Promise<"OK"> {
    this.stopped = true;
    return "OK";
  }

  on(_event: "message", listener: (channel: string, message: string) => void) {
    this.listener = listener;
    return this;
  }

  off(_event: "message", listener: (channel: string, message: string) => void) {
    if (this.listener === listener) this.listener = undefined;
    return this;
  }

  emit(channel: string, message: string): void {
    this.listener?.(channel, message);
  }
}

export class FakeWakeupRedis implements JobWakeupRedis {
  readonly duplicateConnection = new FakeWakeupConnection();
  duplicateCalls = 0;

  duplicate(): FakeWakeupConnection {
    this.duplicateCalls += 1;
    return this.duplicateConnection;
  }
}
