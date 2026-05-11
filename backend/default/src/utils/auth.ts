/**
 * Better Auth Configuration
 * Central authentication setup using better-auth library
 */

import { betterAuth } from "@damatjs/deps/better-auth";
import {
  cacheGetRaw,
  cacheSetRaw,
  cacheDelete,
  getProjectConfig,
} from "@damatjs/utils";
import { Pool } from "@damatjs/deps/pg";
import { getRedis } from '@/lib/redis';

const BETTER_AUTH_KEY_PREFIX = "better-auth:";

export function createAuth() {
  const projectConfig = getProjectConfig();
  const redis = getRedis();

  return betterAuth({
    database: new Pool({
      connectionString: projectConfig.databaseUrl,
    }),

    baseURL:
      process.env.BETTER_AUTH_URL ||
      `http://localhost:${projectConfig.http.port}`,
    basePath: "/api/auth",

    secret: process.env.BETTER_AUTH_SECRET || "default-secret-change-in-production",

    session: {
      expiresIn: Number(process.env.SESSION_MAX_AGE) || 604800,
      updateAge: Number(process.env.SESSION_UPDATE_AGE) || 86400,
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },

    secondaryStorage: {
      get: async (key) => cacheGetRaw(redis, BETTER_AUTH_KEY_PREFIX + key),
      set: async (key, value, ttl) =>
        cacheSetRaw(redis, BETTER_AUTH_KEY_PREFIX + key, value, ttl),
      delete: async (key) => cacheDelete(redis, BETTER_AUTH_KEY_PREFIX + key),
    },

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 16,
      requireEmailVerification: false,
    },

    user: {
      additionalFields: {
        emailVerified: {
          type: "boolean",
          defaultValue: false,
        },
      },
    },

    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        secure: projectConfig.nodeEnv === "production",
        sameSite: "lax",
        path: "/",
      },
    },
  });
}

let authInstance: ReturnType<typeof createAuth> | null = null;

export function getAuth() {
  if (!authInstance) {
    authInstance = createAuth();
  }
  return authInstance;
}

export function resetAuth(): void {
  authInstance = null;
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth extends { $Infer: { Session: infer S } } ? S : never;
