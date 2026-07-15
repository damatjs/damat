import { existsSync } from "node:fs";
import { join } from "node:path";
import { check, install, makeModuleSrc, withTemporaryApp } from "./helpers";

export function verifyOptionalLayouts(): void {
  withTemporaryApp((root, cwd) => {
    const layout = install(makeModuleSrc(root, "none"), cwd);
    check(
      "linksTarget null when no links shipped",
      layout.linksTarget === null,
    );
    check("no src/links created", !existsSync(join(cwd, "src", "links")));
  });
  withTemporaryApp((root, cwd) => {
    const layout = install(makeModuleSrc(root, "flat"), cwd);
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
}
