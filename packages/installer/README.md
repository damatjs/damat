# @damatjs/installer

Headless primitives for installing code and packages from local directories,
Git, registries, npm, and tarballs. The package has no CLI opinions: callers
choose the user experience while the engine owns validation, planning,
provenance, and safe project changes.

It also resolves installed Damat modules. A source path, Node package name, or
`.damat/packages` location becomes one `ResolvedModule` with an absolute entry
and optional model, migration, route, workflow, job, event, and pipeline paths.
Those paths come from `damat.json`,
never from `package.json.exports`. Malformed manifests fail before fallback,
package descriptors accept only valid unscoped or `@scope/name` names, and
resolved paths are checked by real location so symlinks cannot escape the
artifact.

## Install

```bash
bun add @damatjs/installer
```

## Runtime validation

Treat every manifest, lockfile, and origin value as untrusted input. Parse it at
the boundary before planning an installation:

```ts
import {
  parseInstallRecipe,
  parseDamatManifest,
  parseInstallerLock,
  parseOriginRequest,
} from "@damatjs/installer";

const origin = parseOriginRequest({
  type: "git",
  url: "https://github.com/example/auth-module.git",
  ref: "main",
});

const recipe = parseInstallRecipe({
  schemaVersion: 1,
  id: "auth-module",
  kind: "module",
  install: { modes: ["source", "package"], default: "source" },
  mappings: [{ from: "src/**", to: "src/modules/auth" }],
});

const manifest = parseDamatManifest({
  schemaVersion: 1,
  kind: "kit",
  name: "auth-provider",
  install: {
    provides: { feature: { from: "src/**", fallbackTo: "src/auth-provider" } },
  },
});
```

All parsers return normalized copies and reject unknown fields. Recipes are
strictly declarative: executable hooks, scripts, commands, functions, unsafe
targets, and unsupported modes are rejected.

## Origin forms

- `{ type: "local", path }`
- `{ type: "git", url, ref?, subdir? }`
- `{ type: "registry", ref }`
- `{ type: "npm", name, version?, registryUrl? }`
- `{ type: "tarball", url, integrity? }`

Git subdirectories and recipe targets must remain relative to their roots.

## Artifact acquisition

`acquireArtifact(request, ports)` normalizes every origin to a local artifact.
Local directories are used in place. Git checkouts and tarball extraction use
temporary directories with idempotent cleanup. Registry resolution is injected
by the caller, and npm selectors accept exact versions or dist-tags.

Remote access and commands are explicit ports: callers provide `fetch`, a
structured `CommandRunner`, and optionally `resolveRegistry`. Tar extraction
accepts regular files and directories only and rejects absolute paths, parent
traversal, links, devices, and truncated archives.

Tarball integrity is checked against the downloaded archive bytes before any
extraction. Hexadecimal `sha256:<digest>` and npm-style SHA-256/SHA-512 SRI
values are supported. The extracted content then receives a separate canonical
tree hash, so transport integrity and installed-content identity are not mixed.

`resolveArtifact` finalizes an acquisition with canonical SHA-256 tree
integrity and immutable provenance. Git refs are pinned to their commit SHA,
npm dist-tags become exact versions, and registry identities retain the outer
reference. Package mode is advertised only when an immutable package reference
is available.

## Planning

`damat.json` is the bidirectional public profile: providers declare named
`install.provides` capabilities and receivers declare matching
`install.accepts` destinations. `createProfileRecipe` resolves CLI target
overrides first, then receiver paths, then provider fallbacks.

`createInstallPlan` applies mode precedence in this order: caller override,
recipe default, then `source`. An unsupported explicit mode fails instead of
falling back. Source plans map artifact files through declarative glob rules and
carry a checksum for every write. Package plans carry immutable package
references plus declared supporting packages. Plans are serializable and do not
mutate the project.

Package mode requires `experimentalPackage: true`. The Node backend delegates
immutable package references to the detected package manager. The Damat alpha
backend stores self-contained artifacts under `.damat/packages/<id>` and
rejects external runtime dependencies. Unsupported explicit backends fail.

## Ownership and journals

`damat.lock.json` is parsed strictly and replaced atomically. Ownership analysis
detects duplicate targets, unowned collisions, cross-installation ownership,
missing owned files, and user modifications by comparing current checksums.
Shared package ownership is derived from installation records.

Transactions use one exclusive marker and an append-before-mutate inverse
journal under `.damat/transactions`. The journal stores prior bytes only for
touched existing files and delete instructions for newly created files; it does
not copy the project.

Target projects may use Bun, npm, pnpm, or Yarn. Detection considers an explicit
selection, the `packageManager` field, and lockfiles, rejecting ambiguous or
conflicting signals. Adapters return structured command arguments and the exact
manifest/lockfile set they may touch. Dependency scripts are disabled unless a
caller explicitly allows them.

## Add, update, remove, and recover

Add and update planning preserve declared ownership; removed old paths are
explicit operations. Modified owned files require confirmation and only those
modified files are copied to `.damat/backups`. Removal scans declared usage
tokens outside owned files and reports file/line warnings, while cleanup of
integration call sites remains the caller's responsibility.

`executePlan` supports dry runs, journals every managed mutation, applies the
lockfile last, and rolls back exact managed bytes on failure. A surviving active
journal is recovered explicitly with `recoverTransaction`. Package operations
report `node_modules` reconciliation as best-effort because filesystem state
outside package manifests and lockfiles is not transactionally portable.

## Security policy

`evaluateSecurity` returns a structured report containing origin, immutable
identity, expected and computed integrity, verification source, mode, findings,
warnings, and the allow decision. Policies are `off`, `warn`, or `require` for
unverified sources; rejected and revoked registry artifacts are always denied.
Executable recipe fields, unsafe archive findings, integrity mismatches, and
unapproved dependency scripts deny installation.

## Lockfile contract

`parseInstallerLock` validates `damat.lock.json` data. Each installation record
contains immutable origin identity, artifact and recipe integrity, verification
status, install mode, optional package backend, owned file checksums, owned packages, and advisory usage
hints. Shared package ownership is represented by each owning installation
recording the same package reference.

Detailed references: [internals](./docs/README.md),
[origins](./docs/origins.md), [recipes](./docs/recipes.md),
[transactions](./docs/transactions.md), and
[lockfile/security](./docs/lockfile-and-security.md).

## License

MIT
