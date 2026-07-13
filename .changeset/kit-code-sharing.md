---
"@damatjs/damat-cli": minor
---

`damat kit` — code sharing between ANY projects (the `module add` idea generalized, shadcn-style):

- Any codebase can describe itself as a **kit** with a `damat-kit.json`: `mappings` (`[{ from: "<glob>", to: "<dir>" }]`, first match wins) say where each group of files belongs in a RECEIVING project, `fallback` says where files matched by no mapping go (omitted → they're skipped with a warning, never guessed), plus `ignore`, `packages` (npm deps, validated with the same safety gate as `module add`), and `notes`.
- `damat kit add <source>` copies a kit into the current project from a URL, github shorthand (`user/repo[/subdir][#ref]`), or local path — files land as editable source exactly where the manifest says (a mapping's static prefix is stripped, so `src/components/** → app/ui` nests `nav/menu.tsx` under `app/ui/nav/`). Existing files are kept unless `--force`; `--dry-run` prints the full placement first; installs are recorded in a committable `damat-kits.json` (the base for future update/remove); packages install via `bun add` (`--no-install`, `--allow-scripts`). Git sources ride the system git with the same clear git-missing error as `clone`; manifest target paths are validated (relative, no `..`) since manifests come from other people's repositories.
- `damat kit init [name]` writes a starter manifest describing the current codebase; `damat kit validate` checks it and previews where every file would land in a consumer.
