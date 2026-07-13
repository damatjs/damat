import { describe, it, expect, mock, beforeEach } from "bun:test";

// Mock @clerk/backend: createClerkClient returns a fake with a controllable
// authenticateRequest, capturing the keys it was built with.
const state = {
  builtWith: null as unknown,
  isSignedIn: false,
  auth: null as {
    userId: string | null;
    orgId?: string | null;
    sessionClaims?: Record<string, unknown> | null;
  } | null,
  lastRequest: null as Request | null,
  lastOptions: undefined as unknown,
};

mock.module("@clerk/backend", () => ({
  createClerkClient: (opts: unknown) => {
    state.builtWith = opts;
    return {
      authenticateRequest: async (req: Request, options?: unknown) => {
        state.lastRequest = req;
        state.lastOptions = options;
        return { isSignedIn: state.isSignedIn, toAuth: () => state.auth };
      },
    };
  },
}));

import { createClerkAuthProvider } from "../src/index";

const savedSecret = process.env.CLERK_SECRET_KEY;

beforeEach(() => {
  state.builtWith = null;
  state.isSignedIn = false;
  state.auth = null;
  state.lastRequest = null;
  state.lastOptions = undefined;
  process.env.CLERK_SECRET_KEY = "sk_test_123";
  delete process.env.CLERK_PUBLISHABLE_KEY;
});

function ctxFor(headers: Record<string, string> = {}) {
  return {
    req: { raw: new Request("http://localhost/", { headers }) },
  } as unknown as import("@damatjs/deps/hono").Context;
}

describe("createClerkAuthProvider — build", () => {
  it("is named clerk and mounts no routes (hosted provider)", () => {
    const provider = createClerkAuthProvider();
    expect(provider.name).toBe("clerk");
    expect(provider.routes).toBeUndefined();
  });

  it("builds the client from CLERK_SECRET_KEY", () => {
    createClerkAuthProvider();
    expect((state.builtWith as { secretKey: string }).secretKey).toBe(
      "sk_test_123",
    );
  });

  it("passes an explicit secret + publishable key through", () => {
    createClerkAuthProvider({
      secretKey: "sk_live",
      publishableKey: "pk_live",
    });
    expect(state.builtWith).toEqual({
      secretKey: "sk_live",
      publishableKey: "pk_live",
    });
  });

  it("throws a clear error when no secret key is available", () => {
    delete process.env.CLERK_SECRET_KEY;
    expect(() => createClerkAuthProvider()).toThrow(/requires a secret key/);
    if (savedSecret !== undefined) process.env.CLERK_SECRET_KEY = savedSecret;
  });

  it("uses a pre-built client verbatim", async () => {
    state.builtWith = "SENTINEL";
    const provider = createClerkAuthProvider({
      client: {
        authenticateRequest: async () => ({
          isSignedIn: false,
          toAuth: () => null,
        }),
      },
    });
    await provider.authenticate(ctxFor());
    expect(state.builtWith).toBe("SENTINEL"); // createClerkClient never called
  });
});

describe("createClerkAuthProvider — authenticate", () => {
  it("maps a signed-in auth object to the principal (userId → id, orgId → team, claims kept)", async () => {
    state.isSignedIn = true;
    state.auth = {
      userId: "user_1",
      orgId: "org_1",
      sessionClaims: { email: "a@b.co", role: "member" },
    };
    const principal = await createClerkAuthProvider().authenticate(ctxFor());
    expect(principal).toMatchObject({
      id: "user_1",
      orgId: "org_1",
      email: "a@b.co",
      role: "member",
    });
  });

  it("returns null when the request is not signed in", async () => {
    state.isSignedIn = false;
    expect(await createClerkAuthProvider().authenticate(ctxFor())).toBeNull();
  });

  it("returns null when signed in but toAuth has no userId", async () => {
    state.isSignedIn = true;
    state.auth = { userId: null };
    expect(await createClerkAuthProvider().authenticate(ctxFor())).toBeNull();
  });

  it("omits orgId and email when absent", async () => {
    state.isSignedIn = true;
    state.auth = { userId: "user_2", sessionClaims: null };
    const principal = await createClerkAuthProvider().authenticate(ctxFor());
    expect(principal).toEqual({ id: "user_2" });
  });

  it("forwards authorizedParties to authenticateRequest", async () => {
    state.isSignedIn = true;
    state.auth = { userId: "u" };
    await createClerkAuthProvider({
      authorizedParties: ["https://app.example.com"],
    }).authenticate(ctxFor());
    expect(state.lastOptions).toEqual({
      authorizedParties: ["https://app.example.com"],
    });
  });

  it("omits options when no authorizedParties given", async () => {
    state.isSignedIn = true;
    state.auth = { userId: "u" };
    await createClerkAuthProvider().authenticate(ctxFor());
    expect(state.lastOptions).toBeUndefined();
  });
});
