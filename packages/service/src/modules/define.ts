/**
 * Module Definition - Helper Functions
 *
 * Utilities for defining modules and creating exports.
 */

import type { BaseModuleService } from "@/microOrm";
import type { ModuleDefinition, ModuleInstance } from "./types";
import { EntityManager } from '@damatjs/utils';
import { z } from "@damatjs/deps/zod";

/**
 * Define a module with type safety
 *
 * Both TService and TSchema are automatically inferred from the arguments:
 * - TService from the `service` constructor class
 * - TSchema from the `credentials.schema` Zod object
 */
export function defineModule
  <
    TService extends BaseModuleService<any>,
    TSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>
  >
  (
    name: string,
    definition: ModuleDefinition<TService, TSchema>
  ) {
  let getEm: (() => EntityManager) | null = null;
  let credentials: z.infer<TSchema> = {} as z.infer<TSchema>;

  const serviceProxy = new Proxy({} as TService, {
    get(_, prop) {
      if (!getEm) throw new Error(`Module ${name} not initialized. Call init() first.`);

      const service = new definition.service(getEm(), credentials);
      return (service as any)[prop];
    }
  });

  return {
    name,
    service: serviceProxy,
    moduleService: definition.service,
    migrationsPath: definition.migrationsPath || "./migrations",
    init(emFactory: () => EntityManager) {
      getEm = emFactory;
      if (definition.credentials) {
        const output = definition.credentials.load(process.env);
        const result = definition.credentials.schema.safeParse(output);
        if (!result.success) {
          const errors = result.error.issues
            .map(
              (issue: z.core.$ZodIssue) => `  - ${issue.path.join(".")}: ${issue.message}`,
            )
            .join("\n");
          throw new Error(
            `Configuration validation failed for module "${name}":\n${errors}`,
          );
        }
        credentials = result.data as z.infer<TSchema>;
      }
    },
  } as ModuleInstance<TService>;
}
