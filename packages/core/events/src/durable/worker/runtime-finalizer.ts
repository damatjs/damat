import { stopWorker } from "@damatjs/durability";

type PersistStopped = (id: string) => Promise<unknown>;

export class EventWorkerRuntimeFinalizer {
  private waitingForDrain = false;
  private task: Promise<void> | undefined;

  constructor(
    private readonly id: string,
    private readonly stopMaintenance: () => Promise<unknown>,
    private readonly onStopped: () => void,
    private readonly persist: PersistStopped = (workerId) =>
      stopWorker({ id: workerId }),
  ) {}

  get isWaitingForDrain(): boolean {
    return this.waitingForDrain;
  }

  waitForDrain(): void {
    this.waitingForDrain = true;
  }

  finish(): Promise<void> {
    if (this.task) return this.task;
    const task = this.persistStopped();
    this.task = task;
    void task.catch(() => {
      if (this.task === task) this.task = undefined;
    });
    return task;
  }

  private async persistStopped(): Promise<void> {
    await this.stopMaintenance();
    await this.persist(this.id);
    this.waitingForDrain = false;
    this.onStopped();
  }
}
