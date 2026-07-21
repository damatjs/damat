import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { check, install, makeModuleSrc, withTemporaryApp } from "./helpers";

export function verifyCoreLayout(): void {
  withTemporaryApp((root, cwd) => {
    const layout = install(makeModuleSrc(root), cwd);
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
    const owner = readFileSync(
      join(cwd, "src", "links", "user", "index.ts"),
      "utf-8",
    );
    check(
      "owner index uses collectLinkModels",
      owner.includes("collectLinkModels"),
    );
    const aggregate = readFileSync(
      join(cwd, "src", "links", "index.ts"),
      "utf-8",
    );
    check(
      "aggregator uses defineLinkModule + ./user",
      aggregate.includes("defineLinkModule") &&
        aggregate.includes('from "./user"'),
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
}
