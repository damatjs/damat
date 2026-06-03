// import { betterAuth } from "@damatjs/deps/better-auth";
// import { cacheGetRaw, cacheSetRaw, cacheDelete } from "@damatjs/redis";
// import { Pool } from "@damatjs/deps/pg";

// const KEY_PREFIX = "better-auth:";

// export function createAuth() {
//   const config = getProjectConfig();
//   return betterAuth({
//     database: new Pool({ connectionString: config.databaseUrl }),
//     baseURL: process.env.BETTER_AUTH_URL || `http://localhost:${config.http.port}`,
//     basePath: "/api/auth",
//     secret: process.env.BETTER_AUTH_SECRET || "default-secret-change-in-production",
//     session: {
//       expiresIn: Number(process.env.SESSION_MAX_AGE) || 604800,
//       updateAge: Number(process.env.SESSION_UPDATE_AGE) || 86400,
//       cookieCache: { enabled: true, maxAge: 5 * 60 },
//     },
//     secondaryStorage: {
//       get: async (key) => cacheGetRaw(KEY_PREFIX + key),
//       set: async (key, value, ttl) => cacheSetRaw(KEY_PREFIX + key, value, ttl),
//       delete: async (key) => cacheDelete(KEY_PREFIX + key),
//     },
//     emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 16 },
//     user: { additionalFields: { emailVerified: { type: "boolean", defaultValue: false } } },
//     advanced: {
//       defaultCookieAttributes: {
//         httpOnly: true, secure: config.nodeEnv === "production", sameSite: "lax", path: "/",
//       },
//     },
//   });
// }

// let auth: ReturnType<typeof createAuth> | null = null;

// export function getAuth() {
//   if (!auth) auth = createAuth();
//   return auth;
// }

// export type Auth = ReturnType<typeof createAuth>;
// export type Session = Auth extends { $Infer: { Session: infer S } } ? S : never;
