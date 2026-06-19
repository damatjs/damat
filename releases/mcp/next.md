# @damatjs/mcp Unreleased

> The reported server version now derives from package.json instead of a
> hand-maintained constant.

## What changed

`SERVER_VERSION` was a hardcoded string in `src/constants.ts` that had drifted
from the published version (it read `0.0.10` while the package was `0.1.3`). It now
reads the version from this package's `package.json` at load time, so the value
reported on `initialize` always matches the release and can't drift again.

```ts
// Before:
export const SERVER_VERSION = "0.0.10"; // hand-maintained; drifted
// After:
export const SERVER_VERSION = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;
```

## Breaking
- None.

## Action required
- None — drop-in. The server reports the correct version automatically.

## References
- Source: `packages/mcp/src/constants.ts`.
- Current behavior: [package README](../../packages/mcp/README.md).
