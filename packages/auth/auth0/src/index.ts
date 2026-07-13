import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Context } from "@damatjs/deps/hono";
import { defineAuthAdapter, type AuthPrincipal, type AuthProvider } from "@damatjs/auth";

export interface Auth0AdapterOptions {
  /** Auth0 tenant domain, e.g. `myapp.us.auth0.com` (falls back to `AUTH0_DOMAIN`). */
  domain?: string;
  /** API identifier the access token must be issued for (falls back to `AUTH0_AUDIENCE`). */
  audience?: string;
  /** Token issuer (default `https://<domain>/`). */
  issuer?: string;
  /** JWKS endpoint (default `https://<domain>/.well-known/jwks.json`). */
  jwksUri?: string;
  /**
   * OIDC claim to read the email from (default `"email"`). Auth0 access tokens
   * often namespace custom claims, e.g. `https://app/email`.
   */
  emailClaim?: string;
  /** Claim carrying the organization id → the request team (default `"org_id"`). */
  orgClaim?: string;
}

/**
 * Build the Auth0 {@link AuthProvider}. Auth0 is a hosted provider: the backend
 * only **verifies** the access-token JWT against the tenant's JWKS (via `jose`)
 * and reads its claims. Bearer-token only — no cookie session, no provider
 * routes, no local storage. `sub` becomes the principal id, `org_id` the team.
 */
export function createAuth0AuthProvider(options: Auth0AdapterOptions = {}): AuthProvider {
  const domain = options.domain ?? process.env.AUTH0_DOMAIN;
  if (!domain) {
    throw new Error("Auth0 requires a domain — set AUTH0_DOMAIN or pass options.domain");
  }
  const audience = options.audience ?? process.env.AUTH0_AUDIENCE;
  const issuer = options.issuer ?? `https://${domain}/`;
  const jwksUri = options.jwksUri ?? `https://${domain}/.well-known/jwks.json`;
  const emailClaim = options.emailClaim ?? "email";
  const orgClaim = options.orgClaim ?? "org_id";

  const jwks = createRemoteJWKSet(new URL(jwksUri));

  return {
    name: "auth0",
    authenticate: async (c: Context) => {
      const token = bearerToken(c);
      if (!token) return null;
      const { payload } = await jwtVerify(token, jwks, {
        issuer,
        ...(audience ? { audience } : {}),
      });
      return toPrincipal(payload, emailClaim, orgClaim);
    },
  };
}

/** The token from an `Authorization: Bearer <token>` header, or null. */
function bearerToken(c: Context): string | null {
  const header = c.req.header("authorization") ?? c.req.header("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1]! : null;
}

function toPrincipal(
  payload: Record<string, unknown>,
  emailClaim: string,
  orgClaim: string,
): AuthPrincipal {
  const email = typeof payload[emailClaim] === "string" ? (payload[emailClaim] as string) : undefined;
  const orgId = typeof payload[orgClaim] === "string" ? (payload[orgClaim] as string) : undefined;
  return {
    ...payload,
    id: String(payload.sub),
    ...(email !== undefined ? { email } : {}),
    ...(orgId !== undefined ? { orgId } : {}),
  };
}

export default defineAuthAdapter(createAuth0AuthProvider);
