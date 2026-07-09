/** Answer-first copy — also rendered as FAQPage JSON-LD on the home page. */
export const FAQ_ITEMS = [
  {
    question: "What is Damat?",
    answer:
      "Damat is an open-source, composable backend framework for TypeScript on Bun. You assemble a backend from plug-and-play modules — models, services, HTTP routes, and workflows — wired to PostgreSQL and an HTTP server at startup.",
  },
  {
    question: "How is Damat different from a starter template?",
    answer:
      "A starter template copies code into your repo that you maintain forever. A Damat module is a versioned, self-contained package: installing it wires its models, service, config, and migrations into your app, and upgrading it is a version bump rather than a manual merge.",
  },
  {
    question: "Where do modules come from?",
    answer:
      "Three sources: the module registry (entries carry an owner and a verification status), any git URL pinned to a branch or tag, or a local path on disk. Installs can be gated to verified entries with DAMAT_MODULE_VERIFY=require.",
  },
  {
    question: "What does Damat run on?",
    answer:
      "Bun as the runtime, Hono for HTTP, Effect-TS for typed business logic, PostgreSQL as the system of record, and Redis for caching — all strict-mode TypeScript end to end.",
  },
  {
    question: "Can AI assistants work with Damat?",
    answer:
      "Yes. Damat ships an MCP server that lets AI assistants list, search, inspect, and install registry modules directly into an app.",
  },
  {
    question: "Is Damat open source?",
    answer:
      "Yes — MIT licensed, developed in a single public monorepo on GitHub. All packages release in lockstep, so there is one version to care about.",
  },
];
