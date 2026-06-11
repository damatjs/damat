/**
 * The complete authoring surface for module packages.
 *
 * A standalone module imports everything it needs from "@damatjs/module" —
 * models, services, workflows, routes, validation — so the only direct
 * dependency a module package declares is this one.
 */

// Module definition + service base
export {
  defineModule,
  ModuleService,
  type ModuleDefinition,
  type ModuleInstance,
  type ModuleRegistry,
} from "@damatjs/services";

// App-side registry access (used by accessors, steps, and routes)
export { getModule, hasModule, registerModule } from "@damatjs/framework";

// ORM model DSL
export { model, columns } from "@damatjs/orm-model";

// Workflow engine
export {
  createStep,
  createWorkflow,
  executeStep,
  runStep,
  skipStep,
  parallel,
  when,
  ifElse,
  RetryPolicies,
  Effect,
} from "@damatjs/workflow-engine";

// HTTP route contracts (file-based routes inside the module's api/ dir)
export type { RouteHandler, RouteValidator } from "@damatjs/framework/router";

// Validation
export { z } from "@damatjs/deps/zod";
