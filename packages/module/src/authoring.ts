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

// Cross-module links — relate this module's models to models that live in
// *other* modules through an auto-generated junction table, without either
// module importing the other. `defineLink` builds the link + junction model,
// `collectLinkModels` is the `models` map a links dir exports (migrate/codegen),
// and `defineLinkModule` wraps a set of links as the `link` runtime module so
// `getModule("link")` resolves the create/dismiss/fetch/graph service. The
// links themselves live in the app's `src/links/`; these helpers are re-exported
// here so module code shares one authoring surface. See @damatjs/link.
export {
  defineLink,
  collectLinkModels,
  defineLinkModule,
  type LinkService,
  type LinkDefinition,
  type LinkEndpoint,
  type LinkOptions,
  type LinkRowRef,
  type LinkModelRef,
} from "@damatjs/framework";

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
