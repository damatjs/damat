import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { WorkflowContext } from "@damatjs/workflow-engine";

// ─────────────────────────────────────────────────────────────────────────────
// User onboarding workflow + its steps.
//
// External effects are fully mocked so nothing real happens:
//   - @damatjs/framework's getModule() is replaced with an in-test fake user
//     service (no DB).  createProfileStep / its compensation call this.
//   - sendWelcomeEmail and setupDefaults are already pure stubs in source.
//   - workflow .execute() does NOT acquire a redis lock, so no redis needed.
//
// The fake service is mutable via `state` so individual tests can control its
// behavior (success, failure, captured calls) and stay isolated.
// ─────────────────────────────────────────────────────────────────────────────

type CreateArgs = { data: any; returning?: string[] };

const state: {
  createImpl: (args: CreateArgs) => Promise<any>;
  deleteImpl: (args: any) => Promise<any>;
  moduleLoaded: boolean;
  createCalls: CreateArgs[];
  deleteCalls: any[];
} = {
  createImpl: async ({ data }) => ({
    id: "usr_test",
    email: data.email,
    name: data.name ?? null,
  }),
  deleteImpl: async () => undefined,
  moduleLoaded: true,
  createCalls: [],
  deleteCalls: [],
};

const fakeUserService = {
  users: {
    create: mock(async (args: CreateArgs) => {
      state.createCalls.push(args);
      return state.createImpl(args);
    }),
    delete: mock(async (args: any) => {
      state.deleteCalls.push(args);
      return state.deleteImpl(args);
    }),
  },
};

// Replace the whole framework module: the step files only import getModule.
mock.module("@damatjs/framework", () => ({
  getModule: (name: string) =>
    state.moduleLoaded && name === "user" ? fakeUserService : null,
}));

const {
  createProfileStep,
  sendWelcomeEmailStep,
  setupDefaultsStep,
} = await import("@/workflows/user/steps/user-onboarding");
const { userOnboardingWorkflow } = await import(
  "@/workflows/user/workflows/user"
);

const ctx: WorkflowContext = {
  executionId: "exec_test",
  workflowName: "user-onboarding",
  startedAt: new Date(),
  attempt: 1,
  metadata: {},
};

beforeEach(() => {
  state.createImpl = async ({ data }) => ({
    id: "usr_test",
    email: data.email,
    name: data.name ?? null,
  });
  state.deleteImpl = async () => undefined;
  state.moduleLoaded = true;
  state.createCalls = [];
  state.deleteCalls = [];
  fakeUserService.users.create.mockClear();
  fakeUserService.users.delete.mockClear();
});

// ─── step config / metadata ──────────────────────────────────────────────────

describe("steps › definitions", () => {
  it("createProfileStep has expected name, timeout and a compensation handler", () => {
    expect(createProfileStep.name).toBe("create-profile");
    expect(createProfileStep.config.timeoutMs).toBe(10_000);
    expect(typeof createProfileStep.compensate).toBe("function");
  });

  it("sendWelcomeEmailStep has no compensation (pure side-effect-free stub)", () => {
    expect(sendWelcomeEmailStep.name).toBe("send-welcome-email");
    expect(sendWelcomeEmailStep.config.timeoutMs).toBe(5_000);
    expect(sendWelcomeEmailStep.compensate).toBeUndefined();
  });

  it("setupDefaultsStep has a (no-op) compensation handler", () => {
    expect(setupDefaultsStep.name).toBe("setup-defaults");
    expect(typeof setupDefaultsStep.compensate).toBe("function");
  });
});

// ─── createProfileStep ───────────────────────────────────────────────────────

describe("steps › createProfileStep.invoke", () => {
  it("creates a user via the user service and returns the row", async () => {
    const out = await createProfileStep.invoke(
      { email: "new@user.co", name: "New User" },
      ctx,
    );
    expect(out).toEqual({ id: "usr_test", email: "new@user.co", name: "New User" });

    expect(fakeUserService.users.create).toHaveBeenCalledTimes(1);
    const callArg = state.createCalls[0]!;
    expect(callArg.data).toEqual({ email: "new@user.co", name: "New User" });
    expect(callArg.returning).toEqual(["id", "email", "name"]);
  });

  it("throws when the user module is not loaded", async () => {
    state.moduleLoaded = false;
    await expect(
      createProfileStep.invoke({ email: "x@y.co" }, ctx),
    ).rejects.toThrow("User module not loaded");
  });

  it("propagates errors from the user service create", async () => {
    state.createImpl = async () => {
      throw new Error("db write failed");
    };
    await expect(
      createProfileStep.invoke({ email: "x@y.co" }, ctx),
    ).rejects.toThrow("db write failed");
  });

  it("compensation deletes the created user by id", async () => {
    await createProfileStep.compensate!(
      { email: "x@y.co" },
      { id: "usr_42", email: "x@y.co", name: null } as any,
      ctx,
    );
    expect(fakeUserService.users.delete).toHaveBeenCalledTimes(1);
    expect(state.deleteCalls[0]).toEqual({ where: { id: "usr_42" } });
  });

  it("compensation throws when the user module is not loaded", async () => {
    state.moduleLoaded = false;
    await expect(
      createProfileStep.compensate!(
        { email: "x@y.co" },
        { id: "usr_42" } as any,
        ctx,
      ),
    ).rejects.toThrow("User module not loaded");
  });
});

// ─── sendWelcomeEmailStep ────────────────────────────────────────────────────

describe("steps › sendWelcomeEmailStep.invoke", () => {
  it("returns sent:true and a deterministic-prefixed emailId", async () => {
    const user = { id: "usr_99" } as any;
    const out = await sendWelcomeEmailStep.invoke(user, ctx);
    expect(out.sent).toBe(true);
    expect(out.emailId.startsWith("email-usr_99-")).toBe(true);
  });

  it("does not call any external service (no DB interaction)", async () => {
    await sendWelcomeEmailStep.invoke({ id: "usr_1" } as any, ctx);
    expect(fakeUserService.users.create).not.toHaveBeenCalled();
  });
});

// ─── setupDefaultsStep ───────────────────────────────────────────────────────

describe("steps › setupDefaultsStep.invoke", () => {
  it("returns a verification-shaped object keyed by the user's email", async () => {
    const out = await setupDefaultsStep.invoke(
      { user: { email: "u@x.co" } as any, emailSent: true },
      ctx,
    );
    expect(out.identifier).toBe("u@x.co");
    expect(out.id).toBe("sda");
    expect(out.value).toBe("");
    expect(out.created_at).toBeInstanceOf(Date);
    expect(out.expiresAt).toBeInstanceOf(Date);
  });

  it("has a compensation that is a safe no-op", async () => {
    await expect(
      setupDefaultsStep.compensate!({} as any, {} as any, ctx),
    ).resolves.toBeUndefined();
  });
});

// ─── assembled workflow ──────────────────────────────────────────────────────

describe("workflow › userOnboardingWorkflow.execute", () => {
  it("runs all three steps and threads context between them", async () => {
    const res = await userOnboardingWorkflow.execute({
      email: "flow@user.co",
      name: "Flow User",
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.result.user).toEqual({
        id: "usr_test",
        email: "flow@user.co",
        name: "Flow User",
      });
      expect(res.result.emailSent).toBe(true);
      // setupDefaults derives its identifier from the user created upstream
      expect(res.result.settings.identifier).toBe("flow@user.co");
      expect(typeof res.executionId).toBe("string");
      expect(res.durationMs).toBeGreaterThanOrEqual(0);
    }

    // exactly one user create, no compensation on the happy path
    expect(fakeUserService.users.create).toHaveBeenCalledTimes(1);
    expect(fakeUserService.users.delete).not.toHaveBeenCalled();
  });

  it("fails gracefully and compensates when the first step throws", async () => {
    state.createImpl = async () => {
      throw new Error("boom");
    };
    const res = await userOnboardingWorkflow.execute({ email: "z@z.co" });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.message).toContain("boom");
      // The first step threw before completing, so no step succeeded and there
      // was nothing to compensate — `compensated` reflects that reality.
      expect(res.compensated).toBe(false);
    }
    // create threw before returning, so no user was persisted to roll back
    expect(fakeUserService.users.delete).not.toHaveBeenCalled();
  });

  it("rolls back the created profile when a later step fails", async () => {
    // Make the email step blow up so the (already created) profile is compensated.
    const spy = mock(async () => {
      throw new Error("email service down");
    });
    const original = sendWelcomeEmailStep.invoke;
    (sendWelcomeEmailStep as any).invoke = spy;
    try {
      const res = await userOnboardingWorkflow.execute({ email: "rb@user.co" });
      expect(res.success).toBe(false);
      if (!res.success) expect(res.compensated).toBe(true);

      // createProfile succeeded, so its compensation must delete the new user
      expect(fakeUserService.users.create).toHaveBeenCalledTimes(1);
      expect(fakeUserService.users.delete).toHaveBeenCalledTimes(1);
      expect(state.deleteCalls[0]).toEqual({ where: { id: "usr_test" } });
    } finally {
      (sendWelcomeEmailStep as any).invoke = original;
    }
  });

  it("exposes the expected workflow metadata", () => {
    expect(userOnboardingWorkflow.name).toBe("user-onboarding");
    expect(userOnboardingWorkflow.config.timeoutMs).toBe(60_000);
    expect(typeof userOnboardingWorkflow.execute).toBe("function");
  });
});
