/**
 * Initialize all services (Redis, DB, workflow engine)
 */

import { initializeRedis } from "@/lib/redis";
import { initWorkflowEngine } from "@/lib/workflow";

export async function initializeServices(): Promise<void> {
  // Initialize Redis
  initializeRedis();

  // Initialize workflow engine (logger + distributed locking)
  await initWorkflowEngine();
}
