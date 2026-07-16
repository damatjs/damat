// import { Context, Next } from "@damatjs/deps/hono";
// import { AuthenticationError } from "@damatjs/types";
// import { getAuth } from "../../utils/auth";

// export async function sessionAuth(
//   c: Context,
//   next: Next,
// ): Promise<Response | void> {
//   const auth = getAuth();
//   const session = await auth.api.getSession({ headers: c.req.raw.headers });

//   if (!session) {
//     throw new AuthenticationError("Unauthorized: No valid session");
//   }

//   c.set("user", session.user);
//   c.set("session", session.session);

//   await next();
// }

// export async function optionalSessionAuth(
//   c: Context,
//   next: Next,
// ): Promise<Response | void> {
//   try {
//     const auth = getAuth();
//     const session = await auth.api.getSession({ headers: c.req.raw.headers });

//     if (session) {
//       c.set("user", session.user);
//       c.set("session", session.session);
//     }
//   } catch {
//   }

//   await next();
// }

// export async function apiKeyAuth(
//   c: Context,
//   next: Next,
// ): Promise<Response | void> {
//   const apiKey = c.req.header("x-api-key");

//   if (!apiKey) {
//     throw new AuthenticationError("API key required");
//   }

//   if (apiKey !== process.env.API_KEY) {
//     throw new AuthenticationError("Invalid API key");
//   }

//   await next();
// }

// export async function flexibleAuth(
//   c: Context,
//   next: Next,
// ): Promise<Response | void> {
//   const apiKey = c.req.header("x-api-key");

//   if (apiKey && apiKey === process.env.API_KEY) {
//     await next();
//     return;
//   }

//   try {
//     const auth = getAuth();
//     const session = await auth.api.getSession({ headers: c.req.raw.headers });

//     if (session) {
//       c.set("user", session.user);
//       c.set("session", session.session);
//       await next();
//       return;
//     }
//   } catch {
//   }

//   throw new AuthenticationError("Authentication required");
// }

export {};
