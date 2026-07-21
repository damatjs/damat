import { describe, it, expect, afterEach } from "bun:test";
import { userOnboardingWorkflow } from "@/workflows";
import { POST, validators } from "@/api/routes/workflows/route";
import { newUsersSchema } from "@/modules/user/types";

// ─────────────────────────────────────────────────────────────────────────────
// POST /workflows — kicks off the user-onboarding workflow. The handler decides
// between `execute` and `executeWithLock` based on the `?lock=true` query param,
// then maps the workflow result onto an HTTP response.
//
// We don't run the real workflow here (it would need a user service + Redis lock)
// — instead we stub the workflow object's two entry methods so every branch of
// the *handler* (success / failure / lock / thrown error) executes and counts.
// Each test restores the originals afterwards so nothing leaks.
// ─────────────────────────────────────────────────────────────────────────────

const realExecute = userOnboardingWorkflow.execute;
const realExecuteWithLock = userOnboardingWorkflow.executeWithLock;

afterEach(() => {
  (userOnboardingWorkflow as any).execute = realExecute;
  (userOnboardingWorkflow as any).executeWithLock = realExecuteWithLock;
});

type JsonResult = { _data: any; _status: number };

function makeCtx(
  opts: { json?: unknown; query?: Record<string, string> } = {},
) {
  const c = {
    req: {
      json: async () => {
        if (opts.json instanceof Error) throw opts.json;
        return opts.json;
      },
      query: (k: string) => opts.query?.[k],
    },
    json: (data: any, status = 200): JsonResult => ({
      _data: data,
      _status: status,
    }),
  };
  return c as any;
}

describe("routes › POST /workflows", () => {
  it("runs execute() and maps a successful result to a 201", async () => {
    let captured: unknown;
    (userOnboardingWorkflow as any).execute = async (input: unknown) => {
      captured = input;
      return {
        success: true,
        result: { user: { id: "usr_1" }, emailSent: true },
        executionId: "exec_1",
        durationMs: 5,
      };
    };

    const r: JsonResult = await POST(makeCtx({ json: { email: "a@b.co" } }));
    expect(r._status).toBe(201);
    expect(r._data.success).toBe(true);
    expect(r._data.data).toEqual({ user: { id: "usr_1" }, emailSent: true });
    expect(r._data.executionId).toBe("exec_1");
    expect(r._data.durationMs).toBe(5);
    expect(captured).toEqual({ email: "a@b.co" });
  });

  it("uses executeWithLock when ?lock=true, passing the email as lockId", async () => {
    let lockOpts: any;
    (userOnboardingWorkflow as any).executeWithLock = async (
      _input: unknown,
      opts: any,
    ) => {
      lockOpts = opts;
      return {
        success: true,
        result: { ok: true },
        executionId: "exec_locked",
        durationMs: 9,
      };
    };

    const r: JsonResult = await POST(
      makeCtx({ json: { email: "lock@me.co" }, query: { lock: "true" } }),
    );
    expect(r._status).toBe(201);
    expect(r._data.executionId).toBe("exec_locked");
    expect(lockOpts).toEqual({ lockId: "lock@me.co", ttlMs: 60_000 });
  });

  it("maps a failed workflow result to a 500 with error details", async () => {
    (userOnboardingWorkflow as any).execute = async () => ({
      success: false,
      error: { message: "step blew up", code: "STEP_FAILED" },
      executionId: "exec_err",
      compensated: true,
      durationMs: 3,
    });

    const r: JsonResult = await POST(makeCtx({ json: { email: "x@y.co" } }));
    expect(r._status).toBe(500);
    expect(r._data.success).toBe(false);
    expect(r._data.error).toBe("step blew up");
    expect(r._data.errorCode).toBe("STEP_FAILED");
    expect(r._data.compensated).toBe(true);
    expect(r._data.executionId).toBe("exec_err");
  });

  it("catches a thrown error (e.g. body parse failure) and returns 500", async () => {
    const r: JsonResult = await POST(makeCtx({ json: new Error("bad json") }));
    expect(r._status).toBe(500);
    expect(r._data.success).toBe(false);
    expect(r._data.error).toBe("bad json");
  });

  it("catches a non-Error throw with a generic message", async () => {
    (userOnboardingWorkflow as any).execute = async () => {
      // eslint-disable-next-line no-throw-literal
      throw "string failure";
    };
    const r: JsonResult = await POST(makeCtx({ json: { email: "a@b.co" } }));
    expect(r._status).toBe(500);
    expect(r._data.error).toBe("Internal server error");
  });
});

describe("routes › POST /workflows validators", () => {
  it("declares a POST body validator backed by the new-user schema", () => {
    expect(validators).toHaveLength(1);
    expect(validators[0]!.method).toBe("POST");
    expect(validators[0]!.body).toBe(newUsersSchema);
  });
});
