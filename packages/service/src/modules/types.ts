/**
 * Module Definition - Type Definitions
 *
 * Types for defining self-contained modules following Medusa.js patterns.
 */

import type {
  EntityManager,
} from "@damatjs/deps/mikro-orm/core";
import type { BaseModuleService } from "@/microOrm";
import { z } from '@damatjs/deps/zod';

// =============================================================================
// MODULE DEFINITION
// =============================================================================

/**
 * Module credentials configuration
 */
export interface ModuleCredentials<TSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>> {
  schema: TSchema;
  load: (env: NodeJS.ProcessEnv) => Record<string, unknown>;
}

/**
 * Module definition interface
 */
export interface ModuleDefinition<
  TService extends BaseModuleService<any> = BaseModuleService<any>,
  TSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> {
  /** Module's main service class */
  service: new (
    em: EntityManager,
    credentials: z.infer<TSchema>
  ) => TService;
  /** Path to migrations directory (relative to module) */
  migrationsPath?: string;
  /** Module credentials */
  credentials?: ModuleCredentials<TSchema>;
  // /** Module dependencies (other module names) */
  // dependencies?: string[];
  // /** Optional initialization function */
  // onInit?: (service: TService) => Promise<void>;
}

export interface ModuleInstance<TService extends BaseModuleService<any>, TSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>> {
  /** Unique module name */
  name: string;
  /** Path to migrations directory */
  migrationsPath: string;
  /** Initialized service accessor */
  service: TService;
  /** Initialize the module */
  moduleService: new (
    em: EntityManager,
    credentials: z.infer<TSchema>
  ) => TService;
  init: (getEm: () => EntityManager,) => void;
}