import { join } from "node:path";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "node:fs";
import { type Command, reportError } from "@damatjs/cli";
import { ensureLinksInConfig } from "./helpers/config";
import { LINK_DRAFTS_FILENAME, type LinkDraft } from "./helpers/link";
import {
  draftBlanks,
  isReadyDraft,
  renderAggregator,
  renderLinkModel,
  renderOwnerIndex,
} from "./helpers/linkTemplates";

export const moduleLinkSetupCommand: Command = {
  name: "link-setup",
  description: "Materialize completed link drafts into src/links/<owner>/ code",
  usage: "damat module link-setup [--links <dir>]",
  examples: ["damat module link-setup"],
  options: [
    {
      name: "links",
      alias: "l",
      type: "string",
      description: "Links directory",
      default: "src/links",
    },
  ],
  handler: async (ctx) => {
    const linksRel = ctx.options.links as string;
    const linksDir = join(ctx.cwd, linksRel);
    const draftsPath = join(linksDir, LINK_DRAFTS_FILENAME);

    if (!existsSync(draftsPath)) {
      ctx.logger.info("No link drafts to set up");
      return { exitCode: 0 };
    }

    let drafts: LinkDraft[];
    try {
      const parsed = JSON.parse(readFileSync(draftsPath, "utf-8"));
      drafts = Array.isArray(parsed?.links) ? parsed.links : [];
    } catch (e) {
      reportError(ctx.logger, e, {
        prefix: `Could not read ${join(linksRel, LINK_DRAFTS_FILENAME)}`,
      });
      return { exitCode: 1 };
    }

    if (drafts.length === 0) {
      ctx.logger.info("No link drafts to set up");
      return { exitCode: 0 };
    }

    try {
      // Already-generated drafts are skipped silently; the rest split into the
      // ones ready to materialize and the ones still missing a target.
      const pending = drafts.filter((d) => d.status !== "generated");
      const ready = pending.filter(isReadyDraft);
      const notReady = pending.filter((d) => !isReadyDraft(d));

      for (const draft of notReady) {
        ctx.logger.warn(
          `Link "${draft.owner}:${draft.name}" needs a target — ` +
            `fill ${draftBlanks(draft).join(", ")} in ${join(linksRel, LINK_DRAFTS_FILENAME)}`,
        );
      }

      if (ready.length === 0) {
        ctx.logger.info(
          notReady.length > 0
            ? "Nothing generated — fill the targets above, then re-run."
            : "All link drafts are already set up.",
        );
        return { exitCode: 0 };
      }

      const owners = new Set<string>();
      const generatedPairs: string[] = [];

      for (const draft of ready) {
        const owner = draft.owner;
        owners.add(owner);
        const modelsDir = join(linksDir, owner, "models");
        mkdirSync(modelsDir, { recursive: true });
        mkdirSync(join(linksDir, owner, "migrations"), { recursive: true });

        const base = `${draft.from.module}-${draft.to.module}`;
        const modelPath = join(modelsDir, `${base}.ts`);
        if (existsSync(modelPath)) {
          ctx.logger.warn(
            `Skipped ${join(linksRel, owner, "models", `${base}.ts`)} — already exists`,
          );
        } else {
          writeFileSync(modelPath, renderLinkModel(draft));
          ctx.logger.success(
            `Generated ${join(linksRel, owner, "models", `${base}.ts`)}`,
          );
        }
        generatedPairs.push(`${draft.from.module} ↔ ${draft.to.module}`);
        draft.status = "generated";
      }

      // Rebuild each touched owner's index from its models directory, then the
      // top-level aggregator from the owner directories — both derived from the
      // filesystem so repeated runs stay idempotent.
      for (const owner of owners) {
        writeFileSync(
          join(linksDir, owner, "index.ts"),
          renderOwnerIndex(listModelBasenames(join(linksDir, owner, "models"))),
        );
      }
      writeFileSync(
        join(linksDir, "index.ts"),
        renderAggregator(listOwnerDirs(linksDir)),
      );

      // Persist the flipped statuses so a re-run is quiet.
      writeFileSync(
        draftsPath,
        `${JSON.stringify({ links: drafts }, null, 2)}\n`,
      );

      // Make sure the app actually boots/migrates/typegens the links tree.
      const configPath = join(ctx.cwd, "damat.config.ts");
      if (ensureLinksInConfig(configPath, `./${linksRel}`)) {
        ctx.logger.success(`Ensured links: "./${linksRel}" in damat.config.ts`);
      } else {
        ctx.logger.warn(
          `Add \`links: "./${linksRel}"\` to your damat.config.ts (could not edit it automatically)`,
        );
      }

      const ownerList = [...owners];
      ctx.logger.info(
        [
          `Materialized ${generatedPairs.length} link(s): ${generatedPairs.join(", ")}`,
          "Next steps:",
          ...ownerList.map(
            (o) =>
              `  • bun damat-orm migrate:create link:${o}   # junction-table migration`,
          ),
          "  • bun damat-orm migrate:up                   # create the junction tables",
          "  • damat codegen <module>                     # for each linked module",
          "  • restart the dev server                     # link service self-registers",
        ].join("\n"),
      );

      return { exitCode: 0 };
    } catch (e) {
      reportError(ctx.logger, e, { prefix: "Failed to set up links" });
      return { exitCode: 1 };
    }
  },
};

function listModelBasenames(modelsDir: string): string[] {
  if (!existsSync(modelsDir)) return [];
  return readdirSync(modelsDir)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts")
    .map((f) => f.slice(0, -3))
    .sort();
}

function listOwnerDirs(linksDir: string): string[] {
  if (!existsSync(linksDir)) return [];
  return readdirSync(linksDir)
    .filter((name) => {
      const sub = join(linksDir, name);
      let isDir = false;
      try {
        isDir = statSync(sub).isDirectory();
      } catch {
        return false;
      }
      return isDir && existsSync(join(sub, "index.ts"));
    })
    .sort();
}
