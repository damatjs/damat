import {
  heartbeatWorker,
  markWorkerStopping,
  stopWorker,
} from "@damatjs/durability";
import { registerJobWorker } from "./boot";
import { startJobExecution, type JobExecution } from "./execute";
import type { ResolvedWorkerOptions } from "./options";
import { pollJobClaims } from "./poll";
import type { ClaimedJobRun } from "./types";

export interface WorkerDependencies {
  register(input: {
    id: string;
    queue: string;
    concurrency: number;
  }): Promise<void>;
  poll(
    options: ResolvedWorkerOptions,
    workerId: string,
    activeCount: number,
  ): Promise<ClaimedJobRun[]>;
  startExecution(
    claim: ClaimedJobRun,
    options: ResolvedWorkerOptions,
  ): JobExecution;
  heartbeat(id: string, inFlight: number): Promise<void>;
  markStopping(id: string): Promise<void>;
  stop(id: string): Promise<void>;
}

export const workerDependencies: WorkerDependencies = {
  register: registerJobWorker,
  poll: pollJobClaims,
  startExecution: startJobExecution,
  heartbeat: (id, inFlight) => heartbeatWorker({ id, inFlight }),
  markStopping: (id) => markWorkerStopping({ id }),
  stop: (id) => stopWorker({ id }),
};
