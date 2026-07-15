import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { check, install, makeModuleSrc, withTemporaryApp } from "./helpers";

export function verifyOwnership(): void {
  withTemporaryApp((root, cwd) => {
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
    install(src, cwd);
    check(
      "owner edit preserved without --force",
      readFileSync(target, "utf-8") === "// EDITED BY OWNER\n",
    );
    install(src, cwd, true);
    check(
      "owner edit overwritten with --force",
      readFileSync(target, "utf-8").includes("defineLink"),
    );
  });
  withTemporaryApp((root, cwd) => {
    mkdirSync(join(cwd, "src", "links", "billing", "models"), {
      recursive: true,
    });
    writeFileSync(
      join(cwd, "src", "links", "billing", "index.ts"),
      "export const links = [];\n",
    );
    install(makeModuleSrc(root), cwd);
    const aggregate = readFileSync(
      join(cwd, "src", "links", "index.ts"),
      "utf-8",
    );
    check(
      "aggregator preserves a hand-authored owner",
      aggregate.includes('from "./billing"') &&
        aggregate.includes('from "./user"'),
    );
  });
}
