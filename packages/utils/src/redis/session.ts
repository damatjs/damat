/**
 * Redis Module - Session Storage
 *
 * Functions for storing and managing user sessions in Redis.
 */

import type { Redis } from "./types";

const SESSION_PREFIX = "session:";

/**
 * Get session data by token.
 *
 * @param client - Redis client instance
 * @param token - Session token
 * @returns Parsed session data or null if not found
 */
export async function getSession<T>(
  client: Redis,
  token: string,
): Promise<T | null> {
  const value = await client.get(SESSION_PREFIX + token);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Set session data with TTL.
 *
 * @param client - Redis client instance
 * @param token - Session token
 * @param data - Session data (automatically JSON serialized)
 * @param ttlSeconds - Time to live in seconds
 */
export async function setSession<T>(
  client: Redis,
  token: string,
  data: T,
  ttlSeconds: number,
): Promise<void> {
  await client.setex(SESSION_PREFIX + token, ttlSeconds, JSON.stringify(data));
}

/**
 * Delete a session.
 *
 * @param client - Redis client instance
 * @param token - Session token
 */
export async function deleteSession(
  client: Redis,
  token: string,
): Promise<void> {
  await client.del(SESSION_PREFIX + token);
}

/**
 * Extend a session's TTL.
 *
 * @param client - Redis client instance
 * @param token - Session token
 * @param ttlSeconds - New time to live in seconds
 * @returns true if session existed and was extended, false otherwise
 */
export async function extendSession(
  client: Redis,
  token: string,
  ttlSeconds: number,
): Promise<boolean> {
  const result = await client.expire(SESSION_PREFIX + token, ttlSeconds);
  return result === 1;
}
