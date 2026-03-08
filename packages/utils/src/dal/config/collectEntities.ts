import type { DatabaseModule, EntityClass } from "../types";

/**
 * Collect all entities from registered modules.
 */
export function collectEntities(modules: DatabaseModule[]): EntityClass<any>[] {
  return modules.flatMap((m) => m.entities);
}
