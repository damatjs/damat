# Registry — refs, resolution, trust

Source: `src/registry/types.ts`, `parse.ts`, `format.ts`, `entry.ts`,
`readiness.ts`, `resolve.ts`, `verify.ts`.

The registry layer is how modules will be **addressed, distributed, and trusted**
once the hosted registry exists. The backend that performs owner-identity and
source verification is not live yet — but the _contract_ (ref grammar, index
schema, readiness checks, the install-time gate) is fixed now so modules can be
authored registry-ready. `damat module add` already recognizes registry refs and
will resolve them against a registry once it ships; until then it accepts local
paths and git sources.

## Module refs

```ts
interface ModuleRef {
  namespace?: string; // publisher/org. Undefined = default namespace
  name: string; // kebab-case
  version?: string; // semver or dist-tag. Undefined = latest
}
```

Addressing forms:

| Input                 | Parsed                                                      |
| --------------------- | ----------------------------------------------------------- |
| `user`                | `{ name: "user" }`                                          |
| `user@0.2.0`          | `{ name: "user", version: "0.2.0" }`                        |
| `damatjs/user`        | `{ namespace: "damatjs", name: "user" }`                    |
| `damatjs/user@latest` | `{ namespace: "damatjs", name: "user", version: "latest" }` |

### `parseModuleRef` / `formatModuleRef`

```ts
function parseModuleRef(input: string): ModuleRef | null;
function formatModuleRef(ref: ModuleRef): string;
```

`parseModuleRef` matches:

```
/^(?:(?<namespace>[a-z][a-z0-9-]*)\/)?(?<name>[a-z][a-z0-9-]*)(?:@(?<version>[\w.^~><=-]+))?$/
```

Returns `null` for non-refs — crucially `./local/path`, `https://…/b.git`,
`Bad Name`, and `a/b/c` (two slashes). That `null` is what lets the CLI tell a
registry ref apart from a path/git source. `formatModuleRef` round-trips the
canonical string (`namespace/name@version`).

## The registry index schema (`entry.ts`)

A registry — the public one Damat will host, or a company-internal one — is an
index mapping a ref to a fetchable source plus trust metadata.

```ts
interface RegistryIndex {
  modules: Record<string, RegistryModuleEntry>; // keyed by ref (namespace/name)
}

interface RegistryModuleEntry {
  name?: string; // informational; the index key is authoritative
  source: string; // default fetchable source: git url, github shorthand, or path
  description?: string;
  author?: RegistryAuthor; // mirrored from module.json (display/search)
  owner?: RegistryOwner; // verifiable owner — the trust anchor (backend-assigned)
  verification?: RegistryVerification; // trust stamp (absent ⇒ unverified)
  versions?: Record<string, RegistryVersionEntry | string>; // per version/tag; string ⇒ { source }
  latest?: string; // dist-tag → version
  keywords?: string[];
  license?: string;
  homepage?: string;
  repository?: string;
}

interface RegistryVersionEntry {
  source: string;
  integrity?: string; // digest pinned to this version
  verification?: RegistryVerification; // overrides module-level
}

interface RegistryOwner {
  namespace: string; // e.g. "damatjs"
  id?: string; // stable account/org id the backend issued
  url?: string;
  verified?: boolean; // backend verified the owner's identity
}

interface RegistryVerification {
  status: VerificationStatus; // unverified | pending | verified | rejected | revoked
  verifiedBy?: string; // e.g. "registry.damatjs.com"
  verifiedAt?: string; // ISO-8601
  integrity?: string; // "sha256-…"
  reason?: string; // why rejected/revoked — surfaced to installers
}

type VerificationStatus =
  "unverified" | "pending" | "verified" | "rejected" | "revoked";
const VERIFICATION_STATUSES: readonly VerificationStatus[]; // the same five, for iteration
```

### Two planes of control

- **Author plane** — `name/version/author/license/keywords/repository`, declared
  in `module.json`. The registry mirrors these for search/display.
- **Registry plane** — `owner` and `verification`, assigned/stamped by the
  backend. **An author cannot self-verify.** These are the trust anchor.

### Forward-compatibility

The schema degrades to the simplest index: a bare `{ source }`, or even a string
source for a version, is a valid entry. `normalizeVersionEntry(value)` coerces a
version value: a string becomes `{ source }`; an object passes through. Keep this
property when extending the schema.

`RegistryIndexEntry` is a back-compat alias of `RegistryModuleEntry`.

## Resolution (`resolve.ts`)

```ts
interface ResolvedRegistryModule {
  source: string; // fetchable source for the requested ref
  version?: string; // resolved version/tag when one applied
  owner?: RegistryOwner;
  verification: RegistryVerification; // effective; version overrides module; never undefined
  integrity?: string;
  entry: RegistryModuleEntry; // the full record (author/keywords/etc)
}

function resolveRegistryEntry(
  ref,
  registryLocation?,
): Promise<ResolvedRegistryModule | null>;
function resolveRegistryRef(ref, registryLocation?): Promise<string | null>; // just the source
```

`registryLocation` defaults to `process.env.DAMAT_MODULE_REGISTRY` and may be:

- an `http(s)` URL serving the index JSON, or
- a local path to the index JSON, or a directory containing `registry.json`.

Algorithm:

1. No `registryLocation` → return `null` (no registry configured).
2. `loadRegistryIndex` — fetch (URL) or read (file/dir). `validateIndex` requires
   a JSON object with a `modules` object, else throws.
3. `lookupEntry` — try the full key `formatModuleRef({namespace?, name})` then the
   bare `name`. Not found → `null`.
4. **Version requested**:
   - `entry.versions[version]` missing → throw
     `'Registry has "<ref>" but no source for version "<v>"'`.
   - else `normalizeVersionEntry` it, return `{ source: finalizeSource(...), version,
owner, verification: version.verification ?? moduleVerification,
integrity: version.integrity ?? version.verification?.integrity, entry }`.
5. **No version** → return `{ source: finalizeSource(entry.source), version: entry.latest,
owner, verification: moduleVerification, integrity: moduleVerification.integrity, entry }`.

`moduleVerification` defaults to `{ status: "unverified" }` when the entry has
none. `finalizeSource` resolves a **relative local** source against the index
file's directory (so `./pkgs/foo` in a file-based registry becomes an absolute
path); absolute paths, `http(s)://`, and `git@` sources pass through. For a URL
registry, relative sources are left as-is.

(See `tests/registry.test.ts`: default source uses `latest`, pinned version uses
its own integrity but inherits verification, a bare-string version resolves with
no integrity, an entry with no verification resolves to `unverified`, unknown
version throws, unindexed ref returns `null`.)

## Readiness (`readiness.ts`)

```ts
interface ModuleValidationReport {
  valid: boolean; // true when there are no errors (warnings allowed)
  errors: string[]; // block installing/publishing
  warnings: string[]; // gaps to fix before publishing
  manifest: ModuleManifest | null;
}

function validateModuleDir(moduleDir: string): ModuleValidationReport;
```

Checks a module dir against the contract:

- **Errors** (block _install_ — `damat module add` would fail / produce a broken app):
  - directory not found;
  - manifest unreadable/invalid (the `readModuleManifest` error message);
  - entry file (`paths.entry`, default `./index.ts`) missing;
  - any _explicitly declared_ `paths.{models,migrations,workflows,types}` dir that
    doesn't exist.
- **Warnings** (block _publishing_ — works locally but not registry-ready):
  - models dir present but no migrations dir, or migrations dir with no `.sql`;
  - missing `version`, `description`, `author`;
  - missing `registry.license`, `registry.namespace`.

`valid === errors.length === 0`. (Covered by `tests/manifest.test.ts`: a complete
module is valid with no warnings; missing entry is an error; registry gaps are
warnings; models-without-migrations warns.)

## The verification gate (`verify.ts`)

The local, offline gate the CLI runs on `damat module add`. It reads the
verification an index _carries_ and applies a policy. When the backend ships, it
becomes the thing that _stamps_ `RegistryVerification`; this gate stays the same.

```ts
type VerificationPolicy = "off" | "warn" | "require";

interface VerificationDecision {
  allowed: boolean; // may the install proceed?
  status: VerificationStatus; // the status evaluated
  message?: string; // CLI note (reason to warn or block)
}

function verificationPolicy(env?): VerificationPolicy;
function evaluateVerification(
  verification: RegistryVerification | undefined,
  policy?,
): VerificationDecision;
```

### Policy resolution (`verificationPolicy`)

1. `DAMAT_MODULE_VERIFY` (case-insensitive) — `off` | `warn` | `require` wins;
   any other value falls through.
2. else `DAMAT_MODULE_REQUIRE_VERIFIED` truthy (`"1"` or `"true"`) → `require`.
3. else default `warn`.

### Decision (`evaluateVerification`)

Status defaults to `unverified` when verification is `undefined`.

| status                                      | result                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| `rejected` / `revoked`                      | **always blocked**, even under `off`; message includes `reason` if present      |
| `verified`                                  | allowed, no message                                                             |
| `unverified` / `pending` + policy `off`     | allowed, silent                                                                 |
| `unverified` / `pending` + policy `require` | **blocked** (message points to `DAMAT_MODULE_VERIFY=warn` or a path/git source) |
| `unverified` / `pending` + policy `warn`    | allowed, with a warning message                                                 |

(Tests in `tests/registry.test.ts` assert: verified installs cleanly;
rejected/revoked blocked under every policy; unverified is warn-allow / require-block /
off-silent; pending behaves like unverified.)

## End-to-end install flow (intended)

```ts
const ref = parseModuleRef("damatjs/user@0.2.0");
if (!ref) {
  /* treat input as a path / git source */
} else {
  const resolved = await resolveRegistryEntry(ref); // uses DAMAT_MODULE_REGISTRY
  if (!resolved) {
    /* not indexed — fall back to path/git */
  } else {
    const decision = evaluateVerification(resolved.verification); // uses DAMAT_MODULE_VERIFY
    if (!decision.allowed) throw new Error(decision.message);
    if (decision.message) logger.warn(decision.message);
    // fetch resolved.source, record resolved.owner/verification as provenance
  }
}
```

## Gotchas

- A two-slash input (`a/b/c`) is **not** a valid ref (`parseModuleRef → null`).
  The grammar is `namespace?/name@version?`, single optional namespace only.
- `resolveRegistryEntry` returns `null` (configured-but-not-found) but **throws**
  for a known module with an unknown version — distinct failure modes.
- `verification` on `ResolvedRegistryModule` is **never undefined** (defaults to
  `unverified`); `owner`/`integrity` may be undefined.
- Relative source resolution only happens for **file/dir** registries; a URL
  registry leaves relative sources untouched.
- `rejected`/`revoked` ignore policy entirely — there is no env override to install
  them. The only escape is a direct path/git source.
- The trust anchor is `owner` + `verification` from the **registry plane**, not the
  `author` an author declares in `module.json`. Don't conflate them.
