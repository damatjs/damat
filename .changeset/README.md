# Damat release workflow

Damat's active public packages are a Changesets fixed group. Archived packages
are excluded from the workspace and publication discovery.

## Record a change

```bash
bun run changeset
```

Select every package whose public behavior changed. Changesets promotes the
whole fixed group to one version while preserving package-specific changelog
entries.

## Prerelease releases

The repository is in normal stable mode. To prepare a future beta after adding
its changesets, enter prerelease mode first:

```bash
bunx changeset pre enter beta
bun run version-packages
bun install
bun run check:release
RELEASE_TAG=v1.1.0-beta.0 bun scripts/verify-release-tag.ts
bun scripts/publish-packages.ts --dry-run
```

Use the actual shared version in `RELEASE_TAG`. Prerelease packages are
published under the npm `beta` dist-tag; the publisher must never move `latest`.
Commit the prepared version, merge it to `main`, and tag that exact commit as
`v<shared-version>`. The tag workflow repeats every release gate before publish.

## Stable releases

When promoting a tested prerelease, exit pre mode before versioning:

```bash
bunx changeset pre exit
bun run version-packages
bun install
```

Do not publish or push a release tag from a dirty checkout. Package release
notes live in `releases/<package>/`; promote `next.md` to the exact version when
cutting a release.
