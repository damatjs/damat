/**
 * Authentication middleware for Hono
 * Uses Better Auth for session management
 */

import { Context, Next } from "@damatjs/deps/hono";
// import { getAuth } from "@/utils/auth";
// import {
//   getApiKeyService,
//   getTeamService,
//   getUserService,
// } from "@/lib/services";
import { ApiKeyScope } from "@/modules/apiKey/models";
// import { ApiKey } from "@/modules/apiKey/models";
// import { Team } from "@/modules/teams/models";
import {
  AuthenticationError,
  AuthorizationError,
  // ValidatedApiKey,
  // TeamInfo,
  TeamPlan as TypesTeamPlan,
  ApiKeyScope as TypesApiKeyScope,
} from "@damatjs/types";
import { TeamPlan } from "@/modules/teams/models";

// =============================================================================
// TYPE CONVERSION HELPERS
// =============================================================================

// /**
//  * Convert internal TeamPlan enum to types TeamPlan enum
//  */
// function mapTeamPlan(plan: TeamPlan): TypesTeamPlan {
//   switch (plan) {
//     case TeamPlan.FREE:
//       return TypesTeamPlan.FREE;
//     case TeamPlan.PRO:
//     case TeamPlan.STARTER:
//       return TypesTeamPlan.PRO;
//     case TeamPlan.ENTERPRISE:
//     case TeamPlan.CUSTOM:
//     case TeamPlan.LIFETIME:
//       return TypesTeamPlan.ENTERPRISE;
//     default:
//       return TypesTeamPlan.FREE;
//   }
// }

// /**
//  * Convert internal ApiKeyScope to types ApiKeyScope
//  */
// function mapApiKeyScopes(scopes: ApiKeyScope[]): TypesApiKeyScope[] {
//   // Map internal scopes to simplified scopes for context
//   const mapped: TypesApiKeyScope[] = [];
//   for (const scope of scopes) {
//     if (
//       scope === ApiKeyScope.ALL ||
//       scope === ApiKeyScope.TEAM_WRITE ||
//       scope === ApiKeyScope.SECTIONS_WRITE
//     ) {
//       if (!mapped.includes(TypesApiKeyScope.ADMIN)) {
//         mapped.push(TypesApiKeyScope.ADMIN);
//       }
//     }
//     if (
//       scope === ApiKeyScope.SECTIONS_READ ||
//       scope === ApiKeyScope.TEAM_READ ||
//       scope === ApiKeyScope.BILLING_READ
//     ) {
//       if (!mapped.includes(TypesApiKeyScope.READ)) {
//         mapped.push(TypesApiKeyScope.READ);
//       }
//     }
//     if (
//       scope === ApiKeyScope.SECTIONS_SEARCH ||
//       scope === ApiKeyScope.EMBED ||
//       scope === ApiKeyScope.IMAGES
//     ) {
//       if (!mapped.includes(TypesApiKeyScope.WRITE)) {
//         mapped.push(TypesApiKeyScope.WRITE);
//       }
//     }
//   }
//   // Default to READ if no scopes mapped
//   if (mapped.length === 0) {
//     mapped.push(TypesApiKeyScope.READ);
//   }
//   return mapped;
// }

// /**
//  * Convert Team entity to TeamInfo for context
//  */
// function teamToTeamInfo(team: Team): TeamInfo {
//   return {
//     id: team.id,
//     name: team.name,
//     slug: team.slug,
//     description: team.description ?? null,
//     image: team.image ?? null,
//     plan: mapTeamPlan(team.plan),
//     credits: team.credits,
//     creditsUsed: team.creditsUsed,
//     isActive: team.isActive,
//   };
// }

// /**
//  * Convert ApiKey entity to ValidatedApiKey for context
//  */
// function apiKeyToValidatedApiKey(
//   apiKey: ApiKey,
//   teamInfo: TeamInfo,
// ): ValidatedApiKey {
//   return {
//     id: apiKey.id,
//     teamId: apiKey.team.id,
//     team: teamInfo,
//     scopes: mapApiKeyScopes(apiKey.scopes),
//     rateLimit: apiKey.rateLimit ?? null,
//     expiresAt: apiKey.expiresAt ?? null,
//   };
// }

// =============================================================================
// SESSION AUTHENTICATION (for web app) - Using Better Auth
// =============================================================================

/**
 * Session authentication middleware - validates user session using Better Auth
 * Also syncs/fetches user data from MikroORM and loads the user's default team
 */
export async function sessionAuth(
  c: Context,
  next: Next,
): Promise<Response | void> {
  // const auth = getAuth();
  // const session = await auth.api.getSession({ headers: c.req.raw.headers });

  // if (!session) {
  //   c.set("session", null);
  //   c.set("user", null);
  //   c.set("teams", null);
  //   throw new AuthenticationError("Session required");
  // }

  // // Fetch user from MikroORM to get full user data
  // const userService = await getUserService();
  // const mikroUser = await userService.findById(session.user.id);

  // // Fetch user's teams
  // const teamService = await getTeamService();
  // const userTeams = await teamService.getUserTeams(session.user.id);

  // // Get the first team as the default (typically the personal team)
  // const firstTeamEntry = userTeams[0];
  // const defaultTeam = firstTeamEntry?.team ?? null;
  // const defaultTeamInfo = defaultTeam ? teamToTeamInfo(defaultTeam) : null;

  // // Map Better Auth session to our format, enriched with MikroORM data
  // c.set("session", {
  //   id: session.session.id,
  //   userId: session.user.id,
  //   expiresAt: session.session.expiresAt,
  //   user: {
  //     id: session.user.id,
  //     email: mikroUser?.email ?? session.user.email,
  //     name: mikroUser?.name ?? session.user.name ?? null,
  //     image: mikroUser?.image ?? session.user.image ?? null,
  //     emailVerified:
  //       mikroUser?.emailVerified ?? session.user.emailVerified ?? false,
  //   },
  // });
  // c.set("user", {
  //   id: session.user.id,
  //   email: mikroUser?.email ?? session.user.email,
  //   name: mikroUser?.name ?? session.user.name ?? null,
  //   image: mikroUser?.image ?? session.user.image ?? null,
  //   emailVerified:
  //     mikroUser?.emailVerified ?? session.user.emailVerified ?? false,
  // });

  // // Set teams info
  // c.set(
  //   "teams",
  //   userTeams.map(({ team, role }) => ({
  //     ...teamToTeamInfo(team),
  //     role,
  //   })),
  // );

  // // Set default team for session-based requests
  // if (defaultTeamInfo) {
  //   c.set("team", defaultTeamInfo);
  // }

  await next();
}

/**
 * Optional session authentication - doesn't throw if no session
 * Also syncs/fetches user data from MikroORM and loads the user's teams when session exists
 */
export async function optionalSessionAuth(
  c: Context,
  next: Next,
): Promise<Response | void> {
  // const auth = getAuth();
  // const session = await auth.api.getSession({ headers: c.req.raw.headers });

  // if (session) {
  //   // Fetch user from MikroORM to get full user data
  //   const userService = await getUserService();
  //   const mikroUser = await userService.findById(session.user.id);

  //   // Fetch user's teams
  //   const teamService = await getTeamService();
  //   const userTeams = await teamService.getUserTeams(session.user.id);

  //   // Get the first team as the default (typically the personal team)
  //   const firstTeamEntry = userTeams[0];
  //   const defaultTeam = firstTeamEntry?.team ?? null;
  //   const defaultTeamInfo = defaultTeam ? teamToTeamInfo(defaultTeam) : null;

  //   c.set("session", {
  //     id: session.session.id,
  //     userId: session.user.id,
  //     expiresAt: session.session.expiresAt,
  //     user: {
  //       id: session.user.id,
  //       email: mikroUser?.email ?? session.user.email,
  //       name: mikroUser?.name ?? session.user.name ?? null,
  //       image: mikroUser?.image ?? session.user.image ?? null,
  //       emailVerified:
  //         mikroUser?.emailVerified ?? session.user.emailVerified ?? false,
  //     },
  //   });
  //   c.set("user", {
  //     id: session.user.id,
  //     email: mikroUser?.email ?? session.user.email,
  //     name: mikroUser?.name ?? session.user.name ?? null,
  //     image: mikroUser?.image ?? session.user.image ?? null,
  //     emailVerified:
  //       mikroUser?.emailVerified ?? session.user.emailVerified ?? false,
  //   });

  //   // Set teams info
  //   c.set(
  //     "teams",
  //     userTeams.map(({ team, role }) => ({
  //       ...teamToTeamInfo(team),
  //       role,
  //     })),
  //   );

  //   // Set default team for session-based requests
  //   if (defaultTeamInfo) {
  //     c.set("team", defaultTeamInfo);
  //   }
  // } else {
  //   c.set("session", null);
  //   c.set("user", null);
  //   c.set("teams", null);
  // }

  await next();
}

// =============================================================================
// API KEY AUTHENTICATION (for API requests)
// =============================================================================

/**
 * Extract API key from request headers
 */
function extractApiKey(c: Context): string | null {
  const authHeader = c.req.header("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    // API keys start with 'ag_'
    if (token.startsWith("ag_")) {
      return token;
    }
  }

  // Also check X-API-Key header
  return c.req.header("X-API-Key") ?? null;
}

/**
 * API key authentication middleware
 */
export async function apiKeyAuth(
  c: Context,
  next: Next,
): Promise<Response | void> {
  // const apiKeyRaw = extractApiKey(c);

  // if (!apiKeyRaw) {
  //   throw new AuthenticationError(
  //     "API key required. Provide via Authorization header (Bearer ag_xxx) or X-API-Key header",
  //   );
  // }

  // const apiKeyService = await getApiKeyService();
  // const apiKey = await apiKeyService.validateApiKey(apiKeyRaw);

  // if (!apiKey) {
  //   throw new AuthenticationError("Invalid, inactive, or expired API key");
  // }

  // // Convert to context types
  // const teamInfo = teamToTeamInfo(apiKey.team);
  // const validatedApiKey = apiKeyToValidatedApiKey(apiKey, teamInfo);

  // c.set("apiKey", validatedApiKey);
  // c.set("apiKeyRaw", apiKeyRaw);
  // c.set("team", teamInfo);

  // // Add response header with remaining credits
  // const remaining = teamInfo.credits - teamInfo.creditsUsed;
  // c.header("X-Credits-Remaining", remaining.toString());

  await next();
}

/**
 * Require specific API key scope
 */
export function requireScope(scope: TypesApiKeyScope) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const apiKey = c.get("apiKey");

    if (!apiKey) {
      throw new AuthenticationError("API key required");
    }

    if (!apiKey.scopes.includes(scope)) {
      throw new AuthorizationError(`API key missing required scope: ${scope}`);
    }

    await next();
  };
}

// =============================================================================
// COMBINED AUTH (API key OR session)
// =============================================================================

/**
 * Flexible auth that accepts either API key or session token
 * For session auth, also fetches user data from MikroORM and loads teams
 */
export async function flexibleAuth(
  c: Context,
  next: Next,
): Promise<Response | void> {
  const apiKeyRaw = extractApiKey(c);

  // if (apiKeyRaw) {
  //   // API key auth
  //   const apiKeyService = await getApiKeyService();
  //   const apiKey = await apiKeyService.validateApiKey(apiKeyRaw);

  //   if (!apiKey) {
  //     throw new AuthenticationError("Invalid API key");
  //   }

  //   // Convert to context types
  //   const teamInfo = teamToTeamInfo(apiKey.team);
  //   const validatedApiKey = apiKeyToValidatedApiKey(apiKey, teamInfo);

  //   c.set("apiKey", validatedApiKey);
  //   c.set("apiKeyRaw", apiKeyRaw);
  //   c.set("team", teamInfo);
  //   c.set("teams", null);
  //   c.set("session", null);
  //   c.set("user", null);
  // } else {
  //   // Try session auth via Better Auth
  //   const auth = getAuth();
  //   const session = await auth.api.getSession({ headers: c.req.raw.headers });

  //   if (!session) {
  //     throw new AuthenticationError(
  //       "Authentication required. Provide API key or session token",
  //     );
  //   }

  //   // Fetch user from MikroORM to get full user data
  //   const userService = await getUserService();
  //   const mikroUser = await userService.findById(session.user.id);

  //   // Fetch user's teams
  //   const teamService = await getTeamService();
  //   const userTeams = await teamService.getUserTeams(session.user.id);

  //   // Get the first team as the default (typically the personal team)
  //   const firstTeamEntry = userTeams[0];
  //   const defaultTeam = firstTeamEntry?.team ?? null;
  //   const defaultTeamInfo = defaultTeam ? teamToTeamInfo(defaultTeam) : null;

  //   c.set("session", {
  //     id: session.session.id,
  //     userId: session.user.id,
  //     expiresAt: session.session.expiresAt,
  //     user: {
  //       id: session.user.id,
  //       email: mikroUser?.email ?? session.user.email,
  //       name: mikroUser?.name ?? session.user.name ?? null,
  //       image: mikroUser?.image ?? session.user.image ?? null,
  //       emailVerified:
  //         mikroUser?.emailVerified ?? session.user.emailVerified ?? false,
  //     },
  //   });
  //   c.set("user", {
  //     id: session.user.id,
  //     email: mikroUser?.email ?? session.user.email,
  //     name: mikroUser?.name ?? session.user.name ?? null,
  //     image: mikroUser?.image ?? session.user.image ?? null,
  //     emailVerified:
  //       mikroUser?.emailVerified ?? session.user.emailVerified ?? false,
  //   });

  //   // Set teams info
  //   c.set(
  //     "teams",
  //     userTeams.map(({ team, role }) => ({
  //       ...teamToTeamInfo(team),
  //       role,
  //     })),
  //   );

  //   // Set default team for session-based requests
  //   if (defaultTeamInfo) {
  //     c.set("team", defaultTeamInfo);
  //   }

  //   c.set("apiKey", null);
  //   c.set("apiKeyRaw", null);
  // }

  await next();
}
