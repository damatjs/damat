import { RouteHandler, RouteValidator } from "@damatjs/framework/router";
import { userOnboardingWorkflow } from "@/workflows";
import { newUsersSchema } from "@/modules/user/types";

export const POST: RouteHandler = async (c) => {
  try {
    const body = await c.req.json();

    const input = body;
    const useLock = c.req.query("lock") === "true";

    const result = useLock
      ? await userOnboardingWorkflow.executeWithLock(input, {
          lockId: input.email,
          ttlMs: 60_000,
        })
      : await userOnboardingWorkflow.execute(input);

    if (result.success) {
      return c.json(
        {
          success: true,
          data: result.result,
          executionId: result.executionId,
          durationMs: result.durationMs,
        },
        201,
      );
    } else {
      return c.json(
        {
          success: false,
          error: result.error.message,
          errorCode: result.error.code,
          executionId: result.executionId,
          compensated: result.compensated,
          durationMs: result.durationMs,
        },
        500,
      );
    }
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      500,
    );
  }
};

export const validators: RouteValidator[] = [
  {
    method: "POST",
    body: newUsersSchema,
  },
];
