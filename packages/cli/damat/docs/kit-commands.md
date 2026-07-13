# The `kit` command group

Kits generalize the `module add` idea to **every kind of project**: any
codebase that ships a `damat-kit.json` can be copied into any other project.
Like packages into node_modules, but shadcn-style — files arrive as editable
source, placed where the manifest says they belong. Sources:
`src/command/kit/{index,add,init,validate,manifest,plan,source}.ts`.

## The manifest — `damat-kit.json` (`manifest.ts`)

| Field | Meaning |
|---|---|
| `name` | Kebab-case kit id (becomes directory names in the target). |
| `mappings` | `[{ from: "<glob>", to: "<dir>" }]` — evaluated in order, first match wins. `from` globs the kit's files (`**` crosses segments, `*` stays within one); `to` is relative to the receiving project root. |
| `fallback` | Where files matched by NO mapping go. Omitted → those files are skipped with a warning (explicit, never guessed). |
| `ignore` | Globs excluded entirely (tests, docs, …). `damat-kit.json` itself, `.git/`, and `node_modules/` never ship. |
| `packages` | npm deps the kit needs in the target — validated with the same `invalidPackageSpecs` gate as `module add`, installed via `bun add` (`--ignore-scripts` unless `--allow-scripts`). |
| `notes` | Free-form next steps printed after install. |

Security: manifests come from other people's repositories, so every target
path is validated (`targetPathError`) — relative only, no `..`, no drive
letters — before anything is joined onto the project root.

## Placement (`plan.ts`)

`buildKitPlan` walks the kit's files and resolves each one:

1. First matching mapping wins. The part of the file's path after the glob's
   **static prefix** nests under `to`: mapping `src/components/** → app/ui`
   places `src/components/nav/menu.tsx` at `app/ui/nav/menu.tsx`.
2. No mapping matched → `fallback/<original path>`.
3. No fallback either → the file lands in `plan.unmatched` and is reported.

## `add <source>` (`add.ts`)

1. Resolve the source (`source.ts`): an existing local path is used as-is;
   anything else goes through the same URL / `user/repo[/subdir][#ref]`
   grammar as `damat clone`, shallow-cloned to a temp dir with the **system
   git** (clear "git is required…" error when missing — no fallback).
2. Read + validate the manifest, build the plan, and validate `packages`
   specs **before any file is written**.
3. `--dry-run`: print every `source -> target` (fallback-placed files marked)
   plus the `bun add` line, exit 0.
4. Copy: existing targets are **kept** (with a warning) unless `--force`.
5. Record the install in `damat-kits.json` at the project root (upsert by kit
   name: name, version, source ref, type, installedAt, file list) — the
   committable base for future update/remove tooling.
6. `bun add` the packages (`--no-install` to skip; failure exits 1), then
   print the kit's `notes`.

## `init [name]` (`init.ts`)

Writes a starter `damat-kit.json` describing the current codebase (name
defaults to the directory basename; must be kebab-case). The starter maps
`src/**` to `src/<name>` and falls back to `shared/<name>`, so installs are
predictable before the author writes real mappings.

## `validate` (`validate.ts`)

Author-side preview: loads the manifest (structural errors are listed), prints
the full placement table, warns about unmatched files, and fails when the kit
ships zero files.

## Gotchas

- A bare directory name in `from` matches nothing — write `docs/**`.
- Kits carry no history and no linkage: `add` copies files once; re-running
  skips existing files, so local edits survive (use `--force` deliberately).
- The record file (`damat-kits.json`) is meant to be committed — it is how a
  future `kit update`/`kit remove` will know what belongs to which kit.
