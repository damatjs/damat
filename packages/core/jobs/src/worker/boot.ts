import { hostname } from "node:os";
import { getDurabilityClient, registerWorker } from "@damatjs/durability";

export async function registerJobWorker(options: {
  id: string;
  queue: string;
  concurrency: number;
}): Promise<void> {
  getDurabilityClient();
  await registerWorker({
    id: options.id,
    capabilities: [`jobs:${options.queue}`],
    hostname: hostname(),
    processId: process.pid,
    concurrency: options.concurrency,
  });
}
