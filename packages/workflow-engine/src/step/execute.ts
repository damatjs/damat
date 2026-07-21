import { Effect, Scope } from "@damatjs/deps/effect";
import { createContextLogger } from "@damatjs/logger";
import type { StepConfig, StepDefinition, WorkflowContext } from "../types";
import { StepExecutionError, StepTimeoutError } from "../errors";
import { createStepAttempt } from "./attempt";
import { registerStepCompensation } from "./compensation";
import { resolveStepConfig } from "./config";
import { StepResponse } from "./response";
import { withStepRetries } from "./retry";

export function executeStep<I, O, C = undefined>(
  step: StepDefinition<I, O, C>,
  input: I,
  ctx: WorkflowContext,
  overrideConfig?: StepConfig,
): Effect.Effect<O, StepExecutionError | StepTimeoutError, Scope.Scope> {
  const logger = createContextLogger({
    workflow: ctx.workflowName,
    step: step.name,
    executionId: ctx.executionId,
  });
  return Effect.gen(function* () {
    const config = resolveStepConfig(step, ctx, overrideConfig);
    const startedAt = Date.now();
    logger.debug("Executing step", {
      description: config.description || step.name,
      timeout: config.timeoutMs,
    });
    const attempts = { count: 0 };
    const attempt = createStepAttempt(step, input, ctx, config, attempts);
    const raw = yield* withStepRetries(
      attempt,
      step.name,
      config,
      ctx,
      attempts,
    );
    const isResponse = StepResponse.isStepResponse(raw);
    const output = (isResponse ? raw.output : raw) as O;
    const compensateInput = (isResponse ? raw.compensateInput : undefined) as C;
    logger.debug("Step completed", {
      durationMs: Date.now() - startedAt,
      attempts: attempts.count,
    });
    yield* registerStepCompensation(step, compensateInput, ctx);
    return output;
  });
}
