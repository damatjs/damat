# Documentation & releases standard

How documentation works in this repo, and the rules you (human or AI) **must**
follow when you change a package. There are two separate tiers — keep them
separate:

| Tier | Lives in | Answers | Rule |
|------|----------|---------|------|
| **Living docs** | package `README.md`, package `docs/`, `docs/guide/`, `MODULES.md` | "How does this work **right now**?" | Always describes the **current** version only. No history, no "new in X", no "deprecated since Y", no upgrade steps. |
| **Release notes** | `releases/<package>/` | "What **changed** in version N, and how do I move to it?" | One folder per package, one file per version. This is the only place change history and upgrade steps live. |

The point: a reader of the living docs never has to mentally subtract old
behavior. A reader who wants to upgrade goes to `releases/` and gets a precise
"was like this → now like this → do this".

---

## Tier 1 — Living docs (current state only)

- READMEs, `docs/` folders, and the guide describe the software **as it is in the
  current version**. Write as if the current version is the only version that has
  ever existed.
- **Never** put any of these in living docs: version numbers tied to a feature
  ("added in 0.1.3"), "new", "recently", "previously", "deprecated", changelog
  bullets, migration/upgrade steps, or "if you're upgrading…". All of that is
  Tier 2.
- When you change behavior, **edit the living docs in place** so they match the
  new behavior. Delete the description of the old behavior — do not annotate it.
- Stable, version-independent example values are fine. A module's own example
  `"version": "0.2.0"` in `MODULES.md` is illustrative semver, not a Damat
  version — leave those.

## Tier 2 — Release notes (`releases/`)

Structure — one folder per package, named by the package's **unscoped** name
(strip `@damatjs/`), e.g. `@damatjs/orm-model` → `releases/orm-model/`:

```
releases/
  README.md                 # top index: the system + every package → its folder
  <package>/
    README.md               # "all" index for this package (every version, newest first)
    <version>.md            # one file per version with package-relevant changes
```

Rules:
- **`releases/<package>/<version>.md`** — create one for every version that made a
  **package-relevant** change (an API/behavior/feature change, not a pure
  dependency bump or CI tweak). Each documents the move **from the previous
  version**. The earliest such file is the package's "first of its kind".
- **`releases/<package>/README.md`** — the index. Lists **every** published
  version newest-first; links the ones that have a file; marks the rest
  (dependency/maintenance bumps) inline with no link.
- A reader who wants to bump a package opens `releases/<package>/README.md` and is
  routed to the relevant `<version>.md`.
- Do **not** create a `<version>.md` for dependency-only or CI-only bumps — note
  them in the index instead.
- **Unreleased changes** — when you make a package-relevant change but no version
  is being cut yet, record it in `releases/<package>/next.md` (same template,
  titled `@damatjs/<package> Unreleased`). List it as "Unreleased" at the top of
  the package index. When the version is published, rename `next.md` →
  `<version>.md` and update the index entry.

### `<version>.md` template

```markdown
# @damatjs/<package> <version>

> <one-sentence summary of what this version changes for this package>

## What changed

<Prose. Describe the move concretely: it was like this, now it is like this.
Use before/after code when an API or syntax changed.>

## Added
- <new capabilities; omit the section if none>

## Changed / improved
- <behavior changes; omit if none>

## Breaking
- None.            <!-- or: list each break + why -->

## Action required

<What a user on the previous version must do to adopt this. Numbered steps with
exact commands. If nothing is required, say "None — drop-in upgrade." Be explicit
about whether the change is opt-in.>

## References
- Current behavior: <link to the package README / guide chapter (Tier 1)>
- Source: <key files, and the commit/PR if known>
```

For a package's **first** release file (e.g. `0.1.0.md`), "What changed" instead
introduces what the package provides at that baseline.

### `releases/<package>/README.md` index template

```markdown
# @damatjs/<package> — release notes

Change history for this package. For how it works **now**, read the
[package README](../../<dir>/README.md) and its [docs](../../<dir>/docs/).

| Version | Summary | Upgrade notes |
|---------|---------|---------------|
| 0.1.3 | <one line> | [0.1.3 →](./0.1.3.md) |
| 0.1.2 | <one line> | [0.1.2 →](./0.1.2.md) |
| 0.1.1 | Maintenance / dependency bumps | — |
| 0.1.0 | First published release | [0.1.0 →](./0.1.0.md) |
```

---

## The rule for future changes (READ THIS BEFORE YOU EDIT)

When you change any package in a way users can observe, in the **same** change:

1. **Update the living docs in place.** Edit the package `README.md` and
   `docs/`, and any affected `docs/guide/` chapter, so they describe the new
   behavior as the only behavior. Remove old descriptions. No version annotations.
2. **Add a release note.** Create `releases/<package>/<new-version>.md` from the
   template (before → after, added, breaking, action required).
3. **Update the package's release index** `releases/<package>/README.md`.
4. **Keep the top index honest** — add the package to `releases/README.md` if it
   isn't there yet.
5. If the version is the package's first release of a feature area and warrants
   its own file, that's the "first of its kind" file; otherwise it builds on the
   previous version file.

A change is not "done" until both tiers are updated. Living docs that mention a
version, or a behavior change with no `releases/` entry, are defects — fix them.
