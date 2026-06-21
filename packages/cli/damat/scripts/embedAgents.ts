/**
 * Embed the canonical module authoring guide (`AGENTS.md`) into a TypeScript
 * source file so it compiles into `dist` like any other code.
 *
 * Why: `damat module init` writes the guide into every new module. The published
 * package only ships `dist/`, and `tsc` does NOT copy non-`.ts` assets — so a
 * runtime `readFileSync` of a copied `.md` is fragile (it silently vanishes if
 * the copy step is ever skipped). Embedding the content as a string constant
 * guarantees it is present in the published JS with no asset to forget and no
 * runtime path resolution.
 *
 * `AGENTS.md` stays the editable source of truth (also mirrored into
 * `module/module-sample/AGENTS.md`); this script regenerates the embedded copy.
 * It runs as the first step of `bun run build`, and the generated file is also
 * committed so typecheck/tests work without a prebuild.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SCAFFOLD = new URL("../src/command/module/scaffold/", import.meta.url);
const source = new URL("AGENTS.md", SCAFFOLD);
const target = new URL("agents.generated.ts", SCAFFOLD);

const guide = readFileSync(source, "utf-8");

const out = `// AUTO-GENERATED from scaffold/AGENTS.md by scripts/embedAgents.ts.
// Do not edit by hand — edit AGENTS.md and run \`bun run build\` (or
// \`bun scripts/embedAgents.ts\`) to regenerate.
/* eslint-disable */
export const AGENTS_GUIDE: string = ${JSON.stringify(guide)};
`;

writeFileSync(target, out);
console.log(
  `embedAgents: wrote ${guide.length} chars from AGENTS.md -> agents.generated.ts`,
);
