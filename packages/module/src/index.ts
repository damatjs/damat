/**
 * @damatjs/module — the module system's contract, config, runtime, and tooling.
 *
 * Most authoring symbols are imported from their real packages:
 *   - defineModule / ModuleService           → @damatjs/services
 *   - getModule / hasModule / registerModule  → @damatjs/framework
 *   - model / columns                         → @damatjs/orm-model
 *   - workflow engine (createStep, …)         → @damatjs/workflow-engine
 *   - RouteHandler / RouteValidator           → @damatjs/framework/router
 *   - z                                       → @damatjs/deps/zod
 * Durable pipeline authoring is re-exported because pipeline providers are a
 * portable module capability loaded by the standalone and backend runtimes.
 *
 * - Contract:   ModuleManifest (damat.json, with legacy fallback) + validation
 * - Config:     defineModuleConfig — the only thing a module author sets up
 * - Runtime:    startModuleApp / runModuleEntry — a module package runs as a
 *               live app on its own, powered by the framework
 * - Dev/test:   bootModule / withModule — service & workflow tests without a server
 * - Tooling:    createModuleMigration / generateModuleTypes — no app config needed
 * - Registry:   refs, readiness validation, and registry resolution
 */

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

// Durable orchestration authoring surface.
export * from "@damatjs/pipelines";
