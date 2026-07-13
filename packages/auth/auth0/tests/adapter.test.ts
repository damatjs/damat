import { describe, it, expect, mock, beforeEach } from "bun:test";

// Mock jose: createRemoteJWKSet returns a sentinel key set; jwtVerify returns a
// controllable payload or throws. Capture the args verify was called with.
const state = {
  jwksUrl: null as URL | null,
  payload: {} as Record<string, unknown>,
  verifyOptions: undefined as unknown,
  verifyThrows: false,
};

mock.module("jose", () => ({
  createRemoteJWKSet: (url: URL) => {
    state.jwksUrl = url;
    return "JWKS_SET";
  },
  jwtVerify: async (_token: string, _jwks: unknown, options?: unknown) => {
    state.verifyOptions = options;
    if (state.verifyThrows) throw new Error("invalid signature");
    return { payload: state.payload };
  },
}));

import { createAuth0AuthProvider } from "../src/index";

const saved = { domain: process.env.AUTH0_DOMAIN, audience: process.env.AUTH0_AUDIENCE };

beforeEach(() => {
  state.jwksUrl = null;
  state.payload = {};
  state.verifyOptions = undefined;
  state.verifyThrows = false;
  process.env.AUTH0_DOMAIN = "tenant.us.auth0.com";
  delete process.env.AUTH0_AUDIENCE;
});

function ctxFor(headers: Record<string, string> = {}) {
  const h = new Headers(headers);
  return {
    req: { header: (name: string) => h.get(name) ?? undefined },
  } as unknown as import("@damatjs/deps/hono").Context;
}

const bearer = (token: string) => ctxFor({ authorization: `Bearer ${token}` });

describe("createAuth0AuthProvider — build", () => {
  it("is named auth0, mounts no routes, and derives the JWKS URI from the domain", () => {
    const provider = createAuth0AuthProvider();
    expect(provider.name).toBe("auth0");
    expect(provider.routes).toBeUndefined();
    expect(state.jwksUrl?.href).toBe("https://tenant.us.auth0.com/.well-known/jwks.json");
  });

  it("honors an explicit jwksUri", () => {
    createAuth0AuthProvider({ jwksUri: "https://custom/jwks" });
    expect(state.jwksUrl?.href).toBe("https://custom/jwks");
  });

  it("throws a clear error when no domain is available", () => {
    delete process.env.AUTH0_DOMAIN;
    expect(() => createAuth0AuthProvider()).toThrow(/requires a domain/);
    if (saved.domain !== undefined) process.env.AUTH0_DOMAIN = saved.domain;
  });
});

describe("createAuth0AuthProvider — authenticate", () => {
  it("returns null when there is no Authorization header", async () => {
    expect(await createAuth0AuthProvider().authenticate(ctxFor())).toBeNull();
  });

  it("returns null when the header is not a Bearer token", async () => {
    expect(
      await createAuth0AuthProvider().authenticate(ctxFor({ authorization: "Basic abc" })),
    ).toBeNull();
  });

  it("verifies with issuer + audience and maps sub/email/org_id", async () => {
    process.env.AUTH0_AUDIENCE = "https://api.example.com";
    state.payload = { sub: "auth0|1", email: "a@b.co", org_id: "org_9", scope: "read" };
    const principal = await createAuth0AuthProvider().authenticate(bearer("tok"));
    expect(state.verifyOptions).toEqual({
      issuer: "https://tenant.us.auth0.com/",
      audience: "https://api.example.com",
    });
    expect(principal).toMatchObject({ id: "auth0|1", email: "a@b.co", orgId: "org_9", scope: "read" });
  });

  it("omits audience from verify options when none configured", async () => {
    state.payload = { sub: "auth0|2" };
    await createAuth0AuthProvider().authenticate(bearer("tok"));
    expect(state.verifyOptions).toEqual({ issuer: "https://tenant.us.auth0.com/" });
  });

  it("omits email/orgId when the claims are absent", async () => {
    state.payload = { sub: "auth0|3" };
    const principal = await createAuth0AuthProvider().authenticate(bearer("tok"));
    expect(principal).toEqual({ sub: "auth0|3", id: "auth0|3" });
  });

  it("reads namespaced custom claims when configured", async () => {
    state.payload = { sub: "auth0|4", "https://app/email": "x@y.z", "https://app/org": "o1" };
    const principal = await createAuth0AuthProvider({
      emailClaim: "https://app/email",
      orgClaim: "https://app/org",
    }).authenticate(bearer("tok"));
    expect(principal).toMatchObject({ id: "auth0|4", email: "x@y.z", orgId: "o1" });
  });

  it("lets a verification failure propagate (the core middleware treats it as 401)", async () => {
    state.verifyThrows = true;
    await expect(createAuth0AuthProvider().authenticate(bearer("bad"))).rejects.toThrow(
      /invalid signature/,
    );
  });
});
