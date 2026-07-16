import type { ProvidedCapability } from "@damatjs/installer";

export function moduleCapabilities(prefix = ""): Record<string, ProvidedCapability> {
  const path = (value: string) => `${prefix}${value}`;
  return {
    module: { from: path("**"), fallbackTo: "src/modules/{id}" },
    routes: { from: path("api/routes/**"), fallbackTo: "src/modules/{id}/api/routes" },
    workflows: { from: path("workflows/**"), fallbackTo: "src/modules/{id}/workflows" },
    jobs: { from: path("jobs/**"), fallbackTo: "src/modules/{id}/jobs" },
    events: { from: path("events/**"), fallbackTo: "src/modules/{id}/events" },
    pipelines: { from: path("pipelines/**"), fallbackTo: "src/modules/{id}/pipelines" },
    links: { from: path("links/**"), fallbackTo: "src/modules/{id}/links" },
    tests: { from: path("../tests/**"), fallbackTo: "src/tests/modules/{id}" },
    migrations: { from: path("migrations/**"), fallbackTo: "src/modules/{id}/migrations" },
    models: { from: path("models/**"), fallbackTo: "src/modules/{id}/models" },
    types: { from: path("types/**"), fallbackTo: "src/modules/{id}/types" },
  };
}
