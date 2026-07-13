export const SCAFFOLD_NOTE =
  "// Scaffolded once by `damat ... codegen`. Safe to edit — codegen will not\n" +
  "// overwrite this file. Add business logic / real fallbacks here.";

// Teaching hint placed above a step call in generated workflows: steps are
// directly callable, and the optional third argument overrides retry/timeout for
// that one call. Aligned to two spaces to sit inside the `createWorkflow(...)` call.
export const WORKFLOW_OVERRIDE_HINT =
  "  // A step is callable directly. To override retry/timeout for THIS call,\n" +
  "  // pass a third arg: step(input, ctx, { timeoutMs: 15_000, retry: { maxAttempts: 3 } }).";
