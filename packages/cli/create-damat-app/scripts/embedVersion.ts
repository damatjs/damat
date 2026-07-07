/**
 * Embed the package version from `package.json` into a TypeScript source file
 * so the CLI's `--version` output is single-sourced from the manifest instead
 * of a hand-maintained string constant (which went stale — it reported 0.0.1
 * while the package was at 0.5.0).
 *
 * Why not `import pkg from "../package.json"`: `bun build` would inline it,
 * but the `typecheck` script runs plain `tsc --noEmit` with `rootDir: src`,
 * which rejects imports from outside `src/`.
 *
 * Same pattern as packages/cli/damat `scripts/embedAgents.ts`: it runs as the
 * first step of `bun run build`, and the generated file is also committed so
 * typecheck and tests work without a prebuild.
 */
import { readFileSync, writeFileSync } from "node:fs";

const pkgUrl = new URL("../package.json", import.meta.url);
const target = new URL("../src/version.generated.ts", import.meta.url);

const { version } = JSON.parse(readFileSync(pkgUrl, "utf-8")) as {
  version: string;
};

if (typeof version !== "string" || version.length === 0) {
  throw new Error("embedVersion: package.json has no version");
}

const out = `// AUTO-GENERATED from package.json by scripts/embedVersion.ts.
// Do not edit by hand — it is regenerated on \`bun run build\`.
/* eslint-disable */
export const CLI_VERSION: string = ${JSON.stringify(version)};
`;

writeFileSync(target, out);
console.log(`embedVersion: wrote version ${version} -> src/version.generated.ts`);
