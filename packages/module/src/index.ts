/**
 * @damatjs/module — the module system in one package.
 *
 * - Authoring:  the complete authoring surface (defineModule, ModuleService,
 *               model/columns, workflow engine, route types, zod)
 * - Contract:   ModuleManifest (module.json) + validation
 * - Config:     defineModuleConfig — the only thing a module author sets up
 * - Runtime:    startModuleApp / runModuleEntry — a module package runs as a
 *               live app on its own, powered by the framework
 * - Dev/test:   bootModule / withModule — service & workflow tests without a server
 * - Tooling:    createModuleMigration / generateModuleTypes — no app config needed
 * - Registry:   refs, readiness validation, and registry resolution
 */

// Authoring surface (single import for module authors)
export * from "./authoring";

// Manifest contract
export * from "./manifest";

// Module-custom configuration (module.config.ts)
export * from "./config";

// Standalone runtime (live app for one module)
export * from "./runtime";

// Standalone harness (tests without a server)
export * from "./harness";

// Authoring tooling (migrations, codegen)
export * from "./tooling";

// Registry tooling
export * from "./registry";
