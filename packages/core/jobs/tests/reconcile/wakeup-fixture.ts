import type { JobWakeupConnection, JobWakeupRedis } from "../../src/wakeup";

type WakeupListener =
  ((channel: string, message: string) => void) | ((error: Error) => void);

export class FakeWakeupConnection implements JobWakeupConnection {
  subscribed?: string;
  stopped = false;
  private listener?: (channel: string, message: string) => void;
  private errorListener?: (error: Error) => void;

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

  on(event: "message" | "error", listener: WakeupListener) {
    if (event === "message") {
      this.listener = listener as (channel: string, message: string) => void;
    } else this.errorListener = listener as (error: Error) => void;
    return this;
  }

  off(event: "message" | "error", listener: WakeupListener) {
    if (event === "message" && this.listener === listener)
      this.listener = undefined;
    if (event === "error" && this.errorListener === listener) {
      this.errorListener = undefined;
    }
    return this;
  }

  emit(channel: string, message: string): void {
    this.listener?.(channel, message);
  }

  emitError(error: Error): void {
    this.errorListener?.(error);
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
