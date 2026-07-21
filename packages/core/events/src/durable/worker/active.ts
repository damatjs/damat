import { getLogger } from "@damatjs/logger";
import type { EventDeliveryExecution } from "./execution";
import { waitForEventDeliveryDrain } from "./drain";

export class ActiveEventDeliveries {
  private readonly executions = new Set<EventDeliveryExecution>();

  constructor(private readonly onEmpty: () => void) {}

  get size(): number {
    return this.executions.size;
  }

  values(): EventDeliveryExecution[] {
    return [...this.executions];
  }

  track(execution: EventDeliveryExecution): void {
    this.executions.add(execution);
    void execution.promise
      .catch((error) =>
        getLogger().error("Event delivery execution failed", error),
      )
      .finally(() => {
        this.executions.delete(execution);
        if (!this.executions.size) this.onEmpty();
      });
  }

  drain(graceMs: number): Promise<boolean> {
    return waitForEventDeliveryDrain(
      new Set([...this.executions].map(({ promise }) => promise)),
      graceMs,
    );
  }

  async abort(): Promise<void> {
    await Promise.allSettled(
      [...this.executions].map((execution) => execution.abort()),
    );
  }
}
