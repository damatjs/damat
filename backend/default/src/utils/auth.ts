/**
 * Better Auth Configuration
 * Central authentication setup using better-auth library
 *
 * Uses @damatjs/utils for Redis and configuration.
 */

import { betterAuth } from "@damatjs/deps/better-auth";
import {
  cacheGetRaw,
  cacheSetRaw,
  cacheDelete,
  getProjectConfig,
} from "@damatjs/utils";
// import { getModuleConfig, getProjectConfig } from "@/lib/config";
import { Pool } from "@damatjs/deps/pg";
import { logger } from "@/lib/logger";
import userModule from "@/modules/user";
import { getRedis } from '@/lib';

// =============================================================================
// REDIS FOR BETTER AUTH
// =============================================================================

const BETTER_AUTH_KEY_PREFIX = "better-auth:";

// =============================================================================
// BETTER AUTH INSTANCE
// =============================================================================

/**
 * Create the better-auth instance with Redis session storage.
 * Configuration is loaded from the module config system.
 *
 * Note: This function must be called after loadConfig() has been called
 * during app initialization.
 */
export function createAuth() {
  const betterAuthCredentials = userModule.service.credentials.betterAuth;
  const projectConfig = getProjectConfig();
  const redis = getRedis();

  return betterAuth({
    database: new Pool({
      connectionString: projectConfig.databaseUrl,
    }),

    // Base URL for auth endpoints
    baseURL:
      betterAuthCredentials.betterAuthUrl ||
      projectConfig.http.apiBaseUrl ||
      `http://localhost:${projectConfig.http.port}`,
    basePath: "/api/auth",

    // Secret for signing cookies and tokens
    secret: betterAuthCredentials.betterAuthSecret,

    // Session configuration
    session: {
      expiresIn: betterAuthCredentials.sessionMaxAge, // 7 days default
      updateAge: betterAuthCredentials.sessionUpdateAge, // 1 day - refresh threshold
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes cache
      },
    },

    // Secondary storage for sessions using @damatjs/utils cache utilities
    secondaryStorage: {
      get: async (key) => cacheGetRaw(redis, BETTER_AUTH_KEY_PREFIX + key),
      set: async (key, value, ttl) =>
        cacheSetRaw(redis, BETTER_AUTH_KEY_PREFIX + key, value, ttl),
      delete: async (key) => cacheDelete(redis, BETTER_AUTH_KEY_PREFIX + key),
    },

    // Email and password authentication
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 16,
      requireEmailVerification: false, // Set to true in production
    },

    // Social providers (optional - configured via env vars)
    socialProviders: {
      ...(betterAuthCredentials.googleClientId && betterAuthCredentials.googleClientSecret
        ? {
          google: {
            clientId: betterAuthCredentials.googleClientId,
            clientSecret: betterAuthCredentials.googleClientSecret,
          },
        }
        : {}),
      ...(betterAuthCredentials.githubClientId && betterAuthCredentials.githubClientSecret
        ? {
          github: {
            clientId: betterAuthCredentials.githubClientId,
            clientSecret: betterAuthCredentials.githubClientSecret,
          },
        }
        : {}),
    },

    // User configuration
    user: {
      additionalFields: {
        emailVerified: {
          type: "boolean",
          defaultValue: false,
        },
      },
    },

    // Account configuration
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google", "github"],
      },
    },

    // Advanced configuration
    advanced: {
      // Cookie settings for cross-domain support if needed
      defaultCookieAttributes: {
        httpOnly: true,
        secure: projectConfig.nodeEnv === "production",
        sameSite: "lax",
        path: "/",
      },
    },

    // Database hooks for custom logic - sync user data to MikroORM entities
    databaseHooks: {
      user: {
        create: {
          after: async (betterAuthUser) => {
            try {
              // const em = await getEm();

              // // Create/update user entity in our MikroORM models
              // let user = await em.findOne(User, { id: betterAuthUser.id });

              // if (!user) {
              //   // Create user in our models (sync with Better Auth)
              //   const userData: {
              //     id: string;
              //     email: string;
              //     emailVerified: boolean;
              //     createdAt: Date;
              //     updatedAt: Date;
              //     name?: string;
              //     image?: string;
              //   } = {
              //     id: betterAuthUser.id,
              //     email: betterAuthUser.email,
              //     emailVerified: betterAuthUser.emailVerified || false,
              //     createdAt: betterAuthUser.createdAt || new Date(),
              //     updatedAt: betterAuthUser.updatedAt || new Date(),
              //   };
              //   if (betterAuthUser.name) {
              //     userData.name = betterAuthUser.name;
              //   }
              //   if (betterAuthUser.image) {
              //     userData.image = betterAuthUser.image;
              //   }
              //   user = em.create(User, userData);
              // }

              // // Create default team for the user
              // const teamName = betterAuthUser.name
              //   ? `${betterAuthUser.name}'s Team`
              //   : "My Team";
              // const teamSlug = generateSlug(teamName);

              // const team = em.create(Team, {
              //   name: teamName,
              //   slug: teamSlug,
              //   description: "Default team",
              //   credits: 1000, // Default credits
              //   creditsUsed: 0,
              //   isActive: true,
              // });

              // // Create team membership with OWNER role
              // em.create(TeamMember, {
              //   team,
              //   userId: betterAuthUser.id,
              //   role: TeamRole.OWNER,
              //   acceptedAt: new Date(),
              // });

              // await em.flush();

              logger.info("User created with default team", {
                userId: betterAuthUser.id,
                // teamId: team.id,
                email: betterAuthUser.email,
              });
            } catch (error) {
              logger.error(
                "Failed to create user with default team",
                error instanceof Error ? error : new Error(String(error)),
                { userId: betterAuthUser.id },
              );
              // Don't throw - allow auth to continue even if team creation fails
            }
          },
        },
        update: {
          after: async (betterAuthUser) => {
            try {
              // const em = await getEm();

              // // Sync user updates to our MikroORM models
              // const user = await em.findOne(User, { id: betterAuthUser.id });

              // if (user) {
              //   user.email = betterAuthUser.email;
              //   if (betterAuthUser.name) {
              //     user.name = betterAuthUser.name;
              //   }
              //   if (betterAuthUser.image) {
              //     user.image = betterAuthUser.image;
              //   }
              //   user.emailVerified = betterAuthUser.emailVerified || false;
              //   user.updatedAt = new Date();

              //   await em.flush();

              //   logger.debug("User synced from Better Auth", {
              //     userId: betterAuthUser.id,
              //   });
              // }
            } catch (error) {
              logger.error(
                "Failed to sync user update",
                error instanceof Error ? error : new Error(String(error)),
                { userId: betterAuthUser.id },
              );
            }
          },
        },
      },
    },
  });
}

// Lazy-initialized auth instance
let authInstance: ReturnType<typeof createAuth> | null = null;

/**
 * Get the auth instance.
 * Creates it on first call.
 */
export function getAuth() {
  if (!authInstance) {
    authInstance = createAuth();
  }
  return authInstance;
}

/**
 * Reset auth instance (useful for testing)
 */
export function resetAuth(): void {
  authInstance = null;
}

// Export types for use in middleware
export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth extends { $Infer: { Session: infer S } } ? S : never;
