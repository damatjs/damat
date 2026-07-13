import { createClerkClient } from "@clerk/backend";
import type { Context } from "@damatjs/deps/hono";
import { defineAuthAdapter, type AuthPrincipal, type AuthProvider } from "@damatjs/auth";

/** The slice of a Clerk client this adapter uses (kept structural for testing). */
export interface ClerkLike {
  authenticateRequest: (
    request: Request,
    options?: Record<string, unknown>,
  ) => Promise<ClerkRequestState>;
}

interface ClerkRequestState {
  isSignedIn: boolean;
  toAuth: () => ClerkAuthObject | null;
}

interface ClerkAuthObject {
  userId: string | null;
  orgId?: string | null;
  sessionClaims?: Record<string, unknown> | null;
}

export interface ClerkAdapterOptions {
  /** A pre-built Clerk client (escape hatch); when given, the keys below are ignored. */
  client?: ClerkLike;
  /** Clerk secret key (falls back to `process.env.CLERK_SECRET_KEY`). */
  secretKey?: string;
  /** Clerk publishable key (falls back to `process.env.CLERK_PUBLISHABLE_KEY`). */
  publishableKey?: string;
  /** Passed to `authenticateRequest` — the origins allowed to present tokens. */
  authorizedParties?: string[];
}

/**
 * Build the Clerk {@link AuthProvider}. Clerk is a hosted provider: the backend
 * only **verifies** the incoming session token (bearer or cookie) via
 * `authenticateRequest`. There are no provider-owned routes and no local
 * storage — sign-in happens on Clerk. `orgId` becomes the request team.
 */
export function createClerkAuthProvider(options: ClerkAdapterOptions = {}): AuthProvider {
  const client = options.client ?? buildClient(options);
  const authorizedParties = options.authorizedParties;

  return {
    name: "clerk",
    authenticate: async (c: Context) => {
      const state = await client.authenticateRequest(
        c.req.raw,
        authorizedParties ? { authorizedParties } : undefined,
      );
      if (!state.isSignedIn) return null;
      const auth = state.toAuth();
      if (!auth?.userId) return null;
      return toPrincipal(auth);
    },
  };
}

function buildClient(options: ClerkAdapterOptions): ClerkLike {
  const secretKey = options.secretKey ?? process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "Clerk requires a secret key — set CLERK_SECRET_KEY or pass options.secretKey",
    );
  }
  const publishableKey = options.publishableKey ?? process.env.CLERK_PUBLISHABLE_KEY;
  return createClerkClient({
    secretKey,
    ...(publishableKey ? { publishableKey } : {}),
  }) as unknown as ClerkLike;
}

function toPrincipal(auth: ClerkAuthObject): AuthPrincipal {
  const claims = auth.sessionClaims ?? {};
  const email = typeof claims.email === "string" ? claims.email : undefined;
  return {
    ...claims,
    id: auth.userId as string,
    ...(auth.orgId ? { orgId: auth.orgId } : {}),
    ...(email !== undefined ? { email } : {}),
  };
}

export default defineAuthAdapter(createClerkAuthProvider);
