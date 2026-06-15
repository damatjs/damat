# Database setup helpers

`src/utils/database/` contains a complete PostgreSQL database-provisioning flow
(connect, prompt for credentials, create the database, build a connection
string). These helpers are **self-contained and currently not wired into the
create flow** — `damatProjectCreator`/`prepareProject` do not call them today
(the project starter ships its own `.env` defaults instead). They are documented
here because they are present, exported, and the obvious place an automatic
"create my Postgres DB" step would re-attach.

## `postgresClient.ts`

```ts
const DEFAULT_HOST = "localhost";
const DEFAULT_PORT = 5432;
type PostgresConnection = {
  user?: string; password?: string; connectionString?: string;
  database?: string; host?: string; port?: number;
};
export default async (connect: PostgresConnection) => pg.Client  // connected
```

Constructs a `pg.Client` (from `@damatjs/deps/pg`), `await client.connect()`, and
returns the connected client.

## `formatConnectionString.ts`

```ts
encodeDbValue(value): string                 // = encodeURIComponent
export default ({ user, password, host, db }): string  // postgres://user:pass@host/db
```

Builds a `postgres://` URL, URL-encoding user/password, appending `@` only when a
user or password is present, then `host/db`.

## `create.ts`

The orchestration layer (none of it currently invoked by the create flow):

| Export | Purpose |
|---|---|
| `default createDb({ client, db })` | `CREATE DATABASE "<db>"` |
| `runCreateDb({ client, dbName, spinner })` | create the DB, reconnect with it selected, return the new client |
| `getDbClientAndCredentials({ dbName, dbUrl, verbose })` | top-level: branch on `dbUrl` (use it) vs `dbName` (prompt path) |

Internal helpers:

- `doesDbExist(client, dbName)` — `SELECT datname FROM pg_database WHERE datname
  = $1`.
- `getForDbUrl({ dbUrl })` — connect via `connectionString`; on failure log an
  error (which exits).
- `getForDbName({ dbName })` — try the default `postgres`/empty-password
  connection; on failure, prompt (via `@clack/prompts`) for username, password,
  and the user's database name and retry; if the target DB already exists, prompt
  for a different name; finally build the connection string via
  `formatConnectionString`.

`getDbClientAndCredentials` checks `dbUrl` first (a comment notes `dbName` is
otherwise always defined upstream).

## Re-attaching the flow

If/when automatic DB creation is restored, the wiring would be:

```ts
const { client, dbConnectionString, dbName } =
  await getDbClientAndCredentials({ dbName: projectName, verbose });
const newClient = await runCreateDb({ client, dbName, spinner });
// then write dbConnectionString into the project's .env (DATABASE_URL=…)
```

## Gotchas

- **Currently dead code in the create path.** Grep confirms no caller of
  `getDbClientAndCredentials` / `runCreateDb` outside `database/`. Do not assume
  running `create-damat-app` provisions a database — it writes static `.env`
  defaults (see [flow.md](./flow.md)) and relies on the starter.
- **Error logging is fatal**: failures inside these helpers call
  `logMessage({ type: "error" })`, which `process.exit(1)`s — there is no
  caller-side recovery.
- **`@damatjs/deps/pg`** provides the `pg` client (`pg as any` is destructured
  for `Client` in `postgresClient.ts`).
- **Credentials are only prompted in the `dbName` path**; the `dbUrl` path
  expects a ready connection string.
