import { bootModule } from "./boot";
import type { BootableModule, BootModuleOptions, BootedModule } from "./types";

/**
 * Boot a module, run a function against it, and always tear down.
 * Convenience wrapper for tests and scripts.
 *
 * @example
 * ```ts
 * await withModule(userModule, { moduleDir: import.meta.dir }, async ({ service }) => {
 *   const user = await service.user.create({ data: { email } });
 *   expect(user.id).toBeTruthy();
 * });
 * ```
 */
export async function withModule<TService extends object, R>(
  module: BootableModule<TService>,
  options: BootModuleOptions,
  fn: (booted: BootedModule<TService>) => Promise<R>,
): Promise<R> {
  const booted = await bootModule(module, options);
  try {
    return await fn(booted);
  } finally {
    await booted.teardown();
  }
}
