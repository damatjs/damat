import type { Redis } from "@damatjs/redis";

export interface LivenessWorker {
  readonly id: string;
  readonly inFlight: number;
}

export class WorkerLiveness {
  private timer?: ReturnType<typeof setTimeout>;
  private running = false;

  constructor(
    private readonly redis: Redis,
    private readonly workers: LivenessWorker[],
    private readonly ttlMs: number,
    private readonly onError: (error: unknown) => void,
  ) {}

  start(): void {
    this.running = true;
    void this.refresh();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    const keys = this.workers.map(({ id }) => `damat:workers:${id}`);
    if (keys.length) {
      try {
        await this.redis.del(...keys);
      } catch {}
    }
  }

  private async refresh(): Promise<void> {
    if (!this.running) return;
    try {
      await Promise.all(
        this.workers.map((worker) =>
          this.redis.set(
            `damat:workers:${worker.id}`,
            JSON.stringify({ id: worker.id, inFlight: worker.inFlight }),
            "PX",
            this.ttlMs,
          ),
        ),
      );
    } catch (error) {
      this.onError(error);
    } finally {
      if (this.running) {
        this.timer = setTimeout(() => void this.refresh(), this.ttlMs / 3);
      }
    }
  }
}
