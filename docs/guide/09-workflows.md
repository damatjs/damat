[Damat Guide](../GUIDE.md) › Workflows

# 9. Workflows (the saga engine)

For multi-step operations that must **roll back cleanly on failure**, use
[`@damatjs/workflow-engine`](../../packages/workflow-engine/README.md). It
implements the saga pattern on Effect-TS: each step has a forward action and an
optional **compensation**; if a later step fails, the engine runs the
compensations of completed steps in reverse.

## A step (with compensation)

```ts
import { createStep } from "@damatjs/workflow-engine";
import { getModule } from "@damatjs/framework";

export const createProfileStep = createStep<NewUser, User>(
  "create-profile",
  async (input, ctx) => {                       // forward
    const users = getModule("user");
    return users.user.create({ data: { email: input.email }, returning: ["id", "email"] });
  },
  async (input, output, ctx) => {               // compensation (rollback)
    getModule("user").user.delete({ where: { id: output.id } });
  },
  { timeoutMs: 10_000, description: "Create user profile" },
);
```

## A workflow

Workflows compose steps inside an Effect generator with `executeStep`:

```ts
import { createWorkflow, executeStep, Effect } from "@damatjs/workflow-engine";

export const userOnboardingWorkflow = createWorkflow<NewUser, { user: User; emailSent: boolean }>(
  "user-onboarding",
  (input, ctx) =>
    Effect.gen(function* () {
      const user = yield* executeStep(createProfileStep, input, ctx);
      const email = yield* executeStep(sendWelcomeEmailStep, user, ctx);
      return { user, emailSent: email.sent };
    }),
  { timeoutMs: 60_000 },
);
```

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
