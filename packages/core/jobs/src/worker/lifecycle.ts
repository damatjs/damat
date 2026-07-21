type WorkerState = "idle" | "running" | "stopping" | "stopped" | "failed";

export class WorkerLifecycle {
  private state: WorkerState;
  private stopTask: Promise<void> | undefined;

  constructor() {
    this.state = "idle";
  }

  get running(): boolean {
    return this.state === "running";
  }

  start(): boolean {
    if (this.state === "running") return false;
    if (this.state !== "idle") {
      throw new Error(`Job worker cannot be restarted while ${this.state}`);
    }
    this.state = "running";
    return true;
  }

  failStart(): void {
    if (this.state === "running") this.state = "failed";
  }

  stop(createTask: () => Promise<void>): Promise<void> {
    if (this.state === "idle" || this.state === "stopped") {
      return Promise.resolve();
    }
    if (this.stopTask) return this.stopTask;
    this.state = "stopping";
    const task = this.runStop(createTask);
    this.stopTask = task;
    return task;
  }

  private async runStop(createTask: () => Promise<void>): Promise<void> {
    try {
      await createTask();
    } finally {
      this.stopTask = undefined;
    }
  }

  completeStop(): void {
    this.state = "stopped";
  }
}
