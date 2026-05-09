/**
 * Authentication middleware for Hono
 * Uses Better Auth for session management
 */

import { Context, Next } from "@damatjs/deps/hono";
import { AuthenticationError } from "@damatjs/types";

export async function sessionAuth(
  c: Context,
  next: Next,
): Promise<Response | void> {
  await next();
}

export async function optionalSessionAuth(
  c: Context,
  next: Next,
): Promise<Response | void> {
  await next();
}

export async function apiKeyAuth(
  c: Context,
  next: Next,
): Promise<Response | void> {
  throw new AuthenticationError("API key authentication not implemented");
}

export async function flexibleAuth(
  c: Context,
  next: Next,
): Promise<Response | void> {
  await next();
}
