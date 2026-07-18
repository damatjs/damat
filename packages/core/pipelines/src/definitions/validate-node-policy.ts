import type { PipelineNode } from "./manifest";

const TASKS = new Set(["action", "job", "workflow"]);

export function validatePipelineNodePolicy(node: PipelineNode): void {
  if (
    node.kind === "delay" &&
    (!Number.isSafeInteger(node.delayMs) || node.delayMs < 0)
  ) {
    throw new Error(
      `Pipeline delay "${node.id}" requires a non-negative delayMs`,
    );
  }
  if (
    node.kind === "loop" &&
    (!Number.isSafeInteger(node.maxIterations) || node.maxIterations < 1)
  ) {
    throw new Error(`Pipeline loop "${node.id}" requires maxIterations >= 1`);
  }
  if (
    node.kind === "foreach" &&
    (!Number.isSafeInteger(node.maxItems) || node.maxItems < 1)
  ) {
    throw new Error(`Pipeline foreach "${node.id}" requires maxItems >= 1`);
  }
  if (
    node.kind === "join" &&
    node.join &&
    !["all", "any"].includes(node.join)
  ) {
    throw new Error(`Pipeline join "${node.id}" has an invalid policy`);
  }
  if (
    node.failure &&
    !["fail", "continue", "compensate"].includes(node.failure)
  ) {
    throw new Error(`Pipeline node "${node.id}" has an invalid failure policy`);
  }
  if (
    node.compensateWith &&
    (!TASKS.has(node.compensateWith.kind) || !node.compensateWith.name.trim())
  ) {
    throw new Error(
      `Pipeline node "${node.id}" has an invalid compensation task`,
    );
  }
  validateRetry(node);
}

function validateRetry(node: PipelineNode): void {
  const retry = node.retry;
  if (!retry) return;
  if (
    retry.maxAttempts !== undefined &&
    (!Number.isSafeInteger(retry.maxAttempts) || retry.maxAttempts < 1)
  ) {
    throw new Error(
      `Pipeline node "${node.id}" requires retry.maxAttempts >= 1`,
    );
  }
  if (
    retry.backoffMs !== undefined &&
    (!Number.isSafeInteger(retry.backoffMs) || retry.backoffMs < 0)
  ) {
    throw new Error(`Pipeline node "${node.id}" requires retry.backoffMs >= 0`);
  }
  if (
    retry.backoffMultiplier !== undefined &&
    (!Number.isFinite(retry.backoffMultiplier) || retry.backoffMultiplier < 1)
  ) {
    throw new Error(
      `Pipeline node "${node.id}" requires retry.backoffMultiplier >= 1`,
    );
  }
}
