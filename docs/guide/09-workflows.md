[Damat Guide](../GUIDE.md) › Workflows

# 9. Workflows (the saga engine)

For multi-step operations that must **roll back cleanly on failure**, use
[`@damatjs/workflow-engine`](../../packages/workflow-engine/README.md). It
implements the saga pattern on Effect-TS: each step has a forward action and an
optional **compensation**; if a later step fails, the engine runs the
compensations of completed steps in reverse.

## A step (with compensation)

The forward action returns a `StepResponse(output, compensateInput?)`: `output`
flows downstream to the next steps, while `compensateInput` is the payload handed
to the compensation. The compensation receives **only** that payload (plus the
context) — capture whatever rollback needs. The third generic `C` is the payload
type; when it excludes `undefined`, supplying it is required at compile time.

```ts
import { createStep, StepResponse } from "@damatjs/workflow-engine";
import { getModule } from "@damatjs/framework";

export const createProfileStep = createStep<NewUser, User, string>(
  "create-profile",
  async (input, ctx) => {                       // forward
    const users = getModule("user");
    const user = await users.user.create({ data: { email: input.email }, returning: ["id", "email"] });
    // output = the user (downstream); compensateInput = its id (for rollback).
    return new StepResponse(user, user.id);
  },
  async (userId, ctx) => {                       // compensation (rollback)
    getModule("user").user.delete({ where: { id: userId } });
  },
  { timeoutMs: 10_000, description: "Create user profile" },
);
```

## A workflow

A step is **callable**: `step(input, ctx)` is sugar for
`executeStep(step, input, ctx)`, so workflows compose steps inside an Effect
generator by calling them directly — no `executeStep` noise:

```ts
import { createWorkflow, Effect } from "@damatjs/workflow-engine";

export const userOnboardingWorkflow = createWorkflow<NewUser, { user: User; emailSent: boolean }>(
  "user-onboarding",
  (input, ctx) =>
    Effect.gen(function* () {
      const user = yield* createProfileStep(input, ctx);

      // Optional third argument: override retry/timeout for THIS call only.
      // The step definition stays untouched; omit it to keep its configured
      // values. Layering is engine defaults < workflow defaults < step config
      // < this per-call override.
      const email = yield* sendWelcomeEmailStep(user, ctx, {
        timeoutMs: 15_000,
        retry: { maxAttempts: 3 },
      });

      return { user, emailSent: email.sent };
    }),
  { timeoutMs: 60_000 },
);
```

The explicit `executeStep(step, input, ctx, overrideConfig?)` form is still
exported and takes the same optional override — reach for it when you need a
step value the generator can't infer, or prefer the named call.

## Running one

```ts
const result = await userOnboardingWorkflow.execute(input);
// or, to prevent concurrent runs for the same key:
const result = await userOnboardingWorkflow.executeWithLock(input, {
  lockId: input.email,
  ttlMs: 60_000,
});

if (result.success) {
  // result.result, result.executionId, result.durationMs
} else {
  // result.error.message, result.error.code, result.compensated
}
```

Retry policies, control flow (`parallel` / `when` / `ifElse`), distributed
locking, and the error classes are all covered in the
[workflow-engine internals](../../packages/workflow-engine/docs/README.md).
Distributed locks are backed by [`@damatjs/redis`](./10-redis.md).

---

Prev: [← Building HTTP APIs](./08-http-apis.md) · [Guide home](../GUIDE.md) · Next: [Redis →](./10-redis.md)
