/**
 * Centralized dependency re-exports for the damatjs monorepo.
 *
 * Prefer the focused subpath imports (`@damatjs/deps/zod`, `@damatjs/deps/hono`, ...).
 * Namespace re-exports are provided here so the root import also works without
 * name collisions between packages.
 */
export * as hono from "./hono";
export * as zod from "./zod";
export * as effect from "./effect";
export * as pg from "./pg";
export * as ioredis from "./ioredis";
export * as nanoid from "./nanoid";
export * as uuid from "./uuid";
