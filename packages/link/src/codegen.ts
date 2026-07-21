/**
 * Generation of link-aware *module* types.
 *
 * Links don't emit their own row types. Instead, each module's generated types
 * are extended with the linked module's entity — e.g. the `user` module's
 * `Users` interface gains `organizations?: Organizations[]`. This is done with a
 * sibling `<table>.links.ts` file that augments the base interface via
 * declaration merging, so the model-generated `<table>.ts` stays untouched and
 * regenerates cleanly.
 *
 * This module is pure string assembly; the CLI resolves the table/import data
 * (which requires the filesystem and dynamic imports) and hands it here.
 */

/** A single linked field to add to a local module's entity type. */
export interface ResolvedLinkField {
  /** Table of the local entity whose interface is augmented (e.g. "users"). */
  localTable: string;
  /** Field name to add (e.g. "organizations"). */
  field: string;
  /** Table of the linked entity, used to derive its type name (e.g. "organizations"). */
  otherTable: string;
  /** Import path (no extension) to the linked module's types (e.g. "../../organization/types"). */
  importPath: string;
  /** Whether the field is a collection. */
  isList: boolean;
}

export interface LinkAugmentationFile {
  /** File name within the module's types dir, e.g. "users.links.ts". */
  fileName: string;
  /** File content. */
  content: string;
  /** Base path to re-export from the types index, e.g. "users.links". */
  indexExport: string;
}

function pascalCase(name: string): string {
  return name
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function tableToFileBase(table: string): string {
  return table.replace(/_/g, "-");
}

/**
 * Render one `<table>.links.ts` augmentation file per local table. Each file
 * imports the linked types and merges the new fields onto the base interface.
 */
export function renderLinkAugmentations(
  fields: ResolvedLinkField[],
  banner?: string,
): LinkAugmentationFile[] {
  const byTable = new Map<string, ResolvedLinkField[]>();
  for (const f of fields) {
    const arr = byTable.get(f.localTable) ?? [];
    arr.push(f);
    byTable.set(f.localTable, arr);
  }

  const files: LinkAugmentationFile[] = [];
  for (const [localTable, group] of byTable) {
    const localType = pascalCase(localTable);
    const base = tableToFileBase(localTable);

    const importsByPath = new Map<string, Set<string>>();
    const fieldLines: string[] = [];
    const seenFields = new Set<string>();

    for (const f of group) {
      if (seenFields.has(f.field)) continue; // first link to claim a field name wins
      seenFields.add(f.field);
      const otherType = pascalCase(f.otherTable);
      const set = importsByPath.get(f.importPath) ?? new Set<string>();
      set.add(otherType);
      importsByPath.set(f.importPath, set);
      fieldLines.push(
        `    ${f.field}?: ${otherType}${f.isList ? "[]" : " | null"};`,
      );
    }

    const importLines = [...importsByPath.entries()].map(
      ([p, types]) =>
        `import type { ${[...types].sort().join(", ")} } from "${p}";`,
    );

    const head = banner ? `${banner}\n` : "";
    const content =
      head +
      importLines.join("\n") +
      "\n\n" +
      `declare module "./${base}" {\n` +
      `  interface ${localType} {\n` +
      fieldLines.join("\n") +
      "\n  }\n}\n\nexport {};\n";

    files.push({
      fileName: `${base}.links.ts`,
      content,
      indexExport: `${base}.links`,
    });
  }

  return files;
}
