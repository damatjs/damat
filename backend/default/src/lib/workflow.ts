/**
 * Workflow Engine Initialization
 *
 * Sets up the workflow engine with logger and Redis lock manager.
 * Should be called during application startup.
 */

import {
  setLogger,
  initWorkflowLock,
  clearLogger,
} from "@damatjs/workflow-engine";
import { getLogger } from "@/lib/logger";
import { getRedis } from "@/lib/redis";

let initialized = false;

/**
 * Initialize the workflow engine.
 *
 * Sets up:
 * - Logger integration with app logger
 * - Distributed locking via Redis
 *
 * Should be called once during application startup.
 *
 * @example
 * ```typescript
 * // In server.ts main()
 * import { initWorkflowEngine } from "@/utils/workflow";
 *
 * async function main() {
 *   // ... other setup
 *   await initWorkflowEngine();
 *   // ... start server
 * }
 * ```
 */
export async function initWorkflowEngine(): Promise<void> {
  if (initialized) {
    return;
  }

  const logger = getLogger();

  // Set up workflow logger
  setLogger(logger);

  // Set up distributed locking
  const redis = getRedis();
  initWorkflowLock(redis);

  logger.info("Workflow engine initialized", {
    features: ["logger", "distributed-locking"],
  });

  initialized = true;
}

/**
 * Check if workflow engine is initialized.
 */
export function isWorkflowEngineInitialized(): boolean {
  return initialized;
}

/**
 * Reset workflow engine (for testing).
 */
export function resetWorkflowEngine(): void {
  clearLogger();
  initialized = false;
}
