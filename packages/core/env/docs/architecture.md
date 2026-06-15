# Architecture — load order & parsing

Deep dive into the two functions that make up `@damatjs/load-env`. Source:
[`src/index.ts`](../src/index.ts) (loader) and
[`src/parseEnvFile.ts`](../src/parseEnvFile.ts) (parser).

## `loadEnv` — load order & merge

[`src/index.ts:31`](../src/index.ts)

```ts
export function loadEnv(
  environment: string = "development",
  cwd: string = process.cwd(),
): void {
  const envFiles = [
    `.env.${environment}.local`,
    `.env.${environment}`,
    ".env.local",
    ".env",
  ];

  for (const envFile of envFiles) {
    const envPath = path.join(cwd, envFile);

    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, "utf-8");
        const parsed = parseEnvFile(content);

        // Only set if not already defined (allows system env vars to take precedence)
        for (const [key, value] of Object.entries(parsed)) {
          if (value && process.env[key] === undefined) {
            process.env[key] = value;
          }
        }
        return; // ← stops at the first existing file
      } catch (error) {
        console.warn(`Warning: Failed to load ${envFile}:`, error);
      }
    }
  }
}
```

### The candidate list

For `environment = "production"` the cascade is:

1. `.env.production.local`
2. `.env.production`
3. `.env.local`
4. `.env`

Files are searched in `cwd` only (no upward directory walk). Filenames are joined with
`path.join(cwd, name)`.

### First match wins (important)

The loop `return`s as soon as it has successfully read, parsed, and merged a file. This
means:

- Only **one** `.env` file is ever applied per call.
- The ordering of the array is a **priority list for selection**, not a layering order.
  If `.env.production` exists, `.env.local` and `.env` are never read.
- The effective precedence is therefore:
  `.env.{env}.local` > `.env.{env}` > `.env.local` > `.env`.

> Caveat: the function's own JSDoc claims files load `.env` → `.env.local` →
> `.env.{environment}` → `.env.{environment}.local` with "later files override earlier".
> That describes a layering model the code does **not** implement. The code selects the
> single highest-priority file that exists. Trust the implementation.

### Merge semantics

For each `[key, value]` parsed from the chosen file:

- It is written to `process.env[key]` **only if** `value` is truthy **and**
  `process.env[key]` is currently `undefined`.
- Consequence 1 — **system/process env wins:** any variable already present (exported in
  the shell, injected by the platform, set earlier in the process) is preserved.
- Consequence 2 — **empty values are dropped:** a line like `EMPTY=` parses to
  `EMPTY: ""`, which is falsy, so it is not written.

### Error handling

A failing `readFileSync`/`parseEnvFile` for a candidate is caught and reported via
`console.warn`; the loop continues to the next candidate. `loadEnv` never throws.

### Return value

`void`. The effect is entirely the mutation of `process.env`.

## `parseEnvFile` — the parser

[`src/parseEnvFile.ts:4`](../src/parseEnvFile.ts)

```ts
export const parseEnvFile = (content: string): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;     // blanks & comments

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;                          // no '=' → skip

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (value.startsWith('"')) {
      const closingQuote = value.indexOf('"', 1);
      if (closingQuote !== -1) value = value.slice(1, closingQuote);
    } else if (value.startsWith("'")) {
      const closingQuote = value.indexOf("'", 1);
      if (closingQuote !== -1) value = value.slice(1, closingQuote);
    } else {
      const commentIndex = value.indexOf("#");             // inline comment (unquoted only)
      if (commentIndex !== -1) value = value.slice(0, commentIndex).trim();
    }

    result[key] = value;
  }

  return result;
};
```

### Parsing rules, line by line

1. **Split on `\n`.** Each line is processed independently — no multiline values.
2. **Trim.** Leading/trailing whitespace on the whole line is removed.
3. **Skip blanks and full-line comments.** Empty lines and lines starting with `#` are
   ignored.
4. **Require `=`.** The first `=` separates key from value. Lines without `=` are
   skipped. The key is everything before the first `=` (trimmed); the value is
   everything after (trimmed).
5. **Quoted values.** If the value starts with `"` or `'`, the content up to the **next**
   matching quote is taken; anything after the closing quote (including `#`) is
   discarded. If there is no closing quote, the raw remainder (still starting with the
   quote char) is kept as-is.
6. **Inline comments (unquoted only).** For unquoted values, a `#` and everything after
   it is stripped, then the result is re-trimmed.
7. **Assign.** `result[key] = value`. Later duplicate keys overwrite earlier ones within
   the same file.

### Examples

| Line                          | Parsed result                |
| ----------------------------- | ---------------------------- |
| `PORT=3000`                   | `PORT` → `"3000"`            |
| `NAME = My App`               | `NAME` → `"My App"`         |
| `NAME="My App" # comment`     | `NAME` → `"My App"`         |
| `NOTE=value # inline`         | `NOTE` → `"value"`          |
| `QUOTED='a#b'`                | `QUOTED` → `"a#b"` (`#` kept inside quotes) |
| `URL=postgres://a:b@h/db`     | `URL` → `"postgres://a:b@h/db"` |
| `# whole line comment`        | (skipped)                    |
| `NOVALUE`                     | (skipped — no `=`)           |
| `EMPTY=`                      | `EMPTY` → `""` (dropped by `loadEnv`'s truthy guard) |

### What it does **not** support

- **Variable expansion** — `KEY=${OTHER}` is stored literally; no interpolation.
- **Multiline / wrapped values** — values cannot span lines.
- **`export ` prefixes** — `export FOO=bar` parses the key as `export FOO`, not `FOO`.
- **Escapes inside quotes** — `\"` is not unescaped; the parser stops at the first
  closing quote character.
- **A `#` immediately inside an unquoted value** is treated as the start of a comment
  (e.g. `PASS=ab#cd` → `"ab"`). Quote such values.

## Safe extension

- To support layering across multiple `.env` files, remove the early `return` and let
  the loop continue (but keep the "set only if undefined" guard so higher-priority files
  read first still win). This is a behavior change — document it and bump accordingly.
- To support expansion, do it after parsing (resolve `${VAR}` against the
  already-merged `process.env`), ideally as an opt-in flag to preserve current behavior.
- Keep the parser dependency-free; if richer parsing is needed, prefer delegating to
  `dotenv`/`dotenv-expand` from `@damatjs/deps` rather than growing this file.
