import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import type { ModuleLink, ModuleManifest } from "@damatjs/module";
import type { LinkSyncResult } from "./types";

/** Filename of the editable link-rule accumulator under src/links. */
export const LINK_DRAFTS_FILENAME = ".link-drafts.json";

/** A single seeded link rule the backend owner edits before `link-setup`. */
export interface LinkDraft {
  /** Owning module id (the module that declared the rule). */
  owner: string;
  /** Stable rule name within the owner. */
  name: string;
  /** `needs-target` until the owner fills the target; `ready` once filled. */
  status: "needs-target" | "ready" | "generated";
  from: {
    module?: string;
    model?: string;
    field?: string;
    primaryKey?: string;
    isList?: boolean;
  };
  to: {
    module?: string;
    model?: string;
    field?: string;
    primaryKey?: string;
    isList?: boolean;
  };
  pivotTable?: string;
  foreignKeys?: boolean;
  /** Inline reminder for whoever opens the file. */
  _hint?: string;
}

interface LinkDraftsFile {
  links: LinkDraft[];
}

/** Stable identity of a rule across re-installs. */
function draftKey(owner: string, name: string): string {
  return `${owner}:${name}`;
}

/** A target is filled once both its module and model are non-empty. */
function isReady(draft: Pick<LinkDraft, "from" | "to">): boolean {
  return Boolean(
    draft.from.module && draft.from.model && draft.to.module && draft.to.model,
  );
}

function readDrafts(file: string): LinkDraftsFile {
  if (!existsSync(file)) return { links: [] };
  try {
    const parsed = JSON.parse(readFileSync(file, "utf-8")) as LinkDraftsFile;
    if (!parsed || !Array.isArray(parsed.links)) return { links: [] };
    return parsed;
  } catch {
    return { links: [] };
  }
}

function seedDraft(owner: string, name: string, rule: ModuleLink): LinkDraft {
  const draft: LinkDraft = {
    owner,
    name,
    status: "needs-target",
    from: { ...rule.from },
    to: {
      module: rule.to.module ?? "",
      model: rule.to.model ?? "",
      field: rule.to.field ?? "",
      ...(rule.to.primaryKey ? { primaryKey: rule.to.primaryKey } : {}),
      ...(rule.to.isList !== undefined ? { isList: rule.to.isList } : {}),
    },
    pivotTable: rule.pivotTable ?? "",
    foreignKeys: rule.foreignKeys ?? false,
    _hint: "Fill to.module / to.model, then run: damat module link-setup",
  };
  draft.status = isReady(draft) ? "ready" : "needs-target";
  return draft;
}

/**
 * Seed each `manifest.link` rule into the app's `src/links/.link-drafts.json`
 * accumulator — the link analog of `syncEnvVars` appending to `.env.example`.
 *
 * Idempotent: rules already present (by "<owner>:<name>") are left untouched so
 * targets the owner already filled survive a re-install. Returns the rule keys
 * added and the subset still missing a target.
 */
export function syncLinkDrafts(
  appDir: string,
  manifest: ModuleManifest,
): LinkSyncResult {
  const addedDrafts: string[] = [];
  const needsTarget: string[] = [];
  const rules = manifest.link ?? [];
  if (rules.length === 0) return { addedDrafts, needsTarget };

  const linksDir = join(appDir, "src", "links");
  mkdirSync(linksDir, { recursive: true });
  const draftsPath = join(linksDir, LINK_DRAFTS_FILENAME);
  const drafts = readDrafts(draftsPath);
  const existing = new Set(drafts.links.map((d) => draftKey(d.owner, d.name)));

  for (const rule of rules) {
    const owner = rule.from.module ?? manifest.name;
    const name = rule.name ?? `${rule.from.model}-${rule.to.model || "target"}`;
    const key = draftKey(owner, name);
    if (existing.has(key)) continue; // preserve any target the owner already filled

    const draft = seedDraft(owner, name, rule);
    drafts.links.push(draft);
    existing.add(key);
    addedDrafts.push(key);
    if (draft.status !== "ready") needsTarget.push(key);
  }

  if (addedDrafts.length > 0) {
    writeFileSync(draftsPath, `${JSON.stringify(drafts, null, 2)}\n`);
  }

  return { addedDrafts, needsTarget };
}
