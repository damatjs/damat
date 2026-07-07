/** Default lock TTL: 5 minutes */
export const DEFAULT_LOCK_TTL_MS = 300_000;

/** Default lock retry delay: 100ms */
export const DEFAULT_RETRY_DELAY_MS = 100;

/** Default max lock retries: 0 (no retries) */
export const DEFAULT_MAX_RETRIES = 0;

/** Auto-extend locks by default so runs longer than the TTL keep exclusion */
export const DEFAULT_AUTO_EXTEND = true;

/** Lock key prefix for workflow locks */
export const WORKFLOW_LOCK_PREFIX = "workflow-lock:";
