/**
 * Real-filesystem verification for the module link-split behavior.
 *
 * Run with `bun run` (NOT `bun test`) so the package-wide `node:fs` mock in
 * src/command/__tests__/setup.ts is never loaded — these checks need a real
 * filesystem. Exits non-zero on the first failed assertion.
 *
 *   bun packages/cli/damat/scripts/verify-link-split.ts
 */
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installModuleSplit } from "../src/command/module/helpers/copy";

let failures = 0;
function check(label: string, cond: boolean): void {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ ${label}`);
    failures++;
  }
}

type LinkLayout = "none" | "models" | "flat";

function makeModuleSrc(root: string, links: LinkLayout = "models"): string {
  const src = join(root, "module-src");
  mkdirSync(join(src, "models"), { recursive: true });
  writeFileSync(join(src, "index.ts"), "// entry\n");
  writeFileSync(join(src, "models", "user.ts"), "// model\n");
  const linkFile =
    'import { defineLink } from "@damatjs/framework";\nexport default {};\n';
  if (links === "models") {
    mkdirSync(join(src, "links", "models"), { recursive: true });
    writeFileSync(
      join(src, "links", "models", "user-organization.ts"),
      linkFile,
    );
  } else if (links === "flat") {
    mkdirSync(join(src, "links"), { recursive: true });
    writeFileSync(join(src, "links", "user-organization.ts"), linkFile);
  }
  return src;
}

function withTmp(fn: (root: string, cwd: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "damat-split-verify-"));
  const cwd = join(root, "app");
  mkdirSync(cwd, { recursive: true });
  try {
    fn(root, cwd);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const run = (src: string, cwd: string, force = false) =>
  installModuleSplit(src, {
    cwd,
    moduleId: "user",
    modulesDir: "src/modules",
    packageDir: src,
    force,
  });

console.log("link-split verification:");

withTmp((root, cwd) => {
  const layout = run(makeModuleSrc(root), cwd);
  check(
    "linksTarget points at src/links/user",
    layout.linksTarget === join(cwd, "src", "links", "user"),
  );
  check(
    "link model copied into src/links/user/models",
    existsSync(
      join(cwd, "src", "links", "user", "models", "user-organization.ts"),
    ),
  );
  check(
    "empty migrations dir created",
    existsSync(join(cwd, "src", "links", "user", "migrations")),
  );
  const ownerIndex = readFileSync(
    join(cwd, "src", "links", "user", "index.ts"),
    "utf-8",
  );
  check(
    "owner index uses collectLinkModels",
    ownerIndex.includes("collectLinkModels"),
  );
  const aggregator = readFileSync(
    join(cwd, "src", "links", "index.ts"),
    "utf-8",
  );
  check(
    "aggregator uses defineLinkModule + ./user",
    aggregator.includes("defineLinkModule") &&
      aggregator.includes('from "./user"'),
  );
  check(
    "links NOT duplicated under src/modules/user",
    !existsSync(join(cwd, "src", "modules", "user", "links")),
  );
  check(
    "module home still landed",
    existsSync(join(cwd, "src", "modules", "user", "index.ts")),
  );
});

withTmp((root, cwd) => {
  const src = makeModuleSrc(root);
  const target = join(
    cwd,
    "src",
    "links",
    "user",
    "models",
    "user-organization.ts",
  );
  mkdirSync(join(cwd, "src", "links", "user", "models"), { recursive: true });
  writeFileSync(target, "// EDITED BY OWNER\n");
  run(src, cwd); // no force
  check(
    "owner edit preserved without --force",
    readFileSync(target, "utf-8") === "// EDITED BY OWNER\n",
  );
  run(src, cwd, true); // force
  check(
    "owner edit overwritten with --force",
    readFileSync(target, "utf-8").includes("defineLink"),
  );
});

withTmp((root, cwd) => {
  mkdirSync(join(cwd, "src", "links", "billing", "models"), {
    recursive: true,
  });
  writeFileSync(
    join(cwd, "src", "links", "billing", "index.ts"),
    "export const links = [];\n",
  );
  run(makeModuleSrc(root), cwd);
  const aggregator = readFileSync(
    join(cwd, "src", "links", "index.ts"),
    "utf-8",
  );
  check(
    "aggregator preserves a hand-authored owner",
    aggregator.includes('from "./billing"') &&
      aggregator.includes('from "./user"'),
  );
});

withTmp((root, cwd) => {
  const layout = run(makeModuleSrc(root, "none"), cwd);
  check("linksTarget null when no links shipped", layout.linksTarget === null);
  check("no src/links created", !existsSync(join(cwd, "src", "links")));
});

// A flat `links/<x>.ts` layout (no models/ subdir) is still recognized and
// separated into src/links/<id>/models/ — never dumped into the module home.
withTmp((root, cwd) => {
  const layout = run(makeModuleSrc(root, "flat"), cwd);
  check(
    "flat links/<x>.ts → linksTarget set",
    layout.linksTarget === join(cwd, "src", "links", "user"),
  );
  check(
    "flat link separated into src/links/user/models",
    existsSync(
      join(cwd, "src", "links", "user", "models", "user-organization.ts"),
    ),
  );
  check(
    "flat link NOT dumped into src/modules/user",
    !existsSync(join(cwd, "src", "modules", "user", "links")),
  );
});

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll link-split checks passed.");
