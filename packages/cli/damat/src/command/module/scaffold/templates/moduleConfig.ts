export function moduleConfigTemplate(): string {
  return `import { defineModuleConfig } from "@damatjs/module";

// The only module-custom setup. Everything else (server, db wiring,
// migrations, tests) is provided by the module runtime.
export default defineModuleConfig({
  projectConfig: {
    // http: { port: 7654 },
  },
});
`;
}
