import { buildDatabaseUrl, validateDatabaseUrl } from "./url";
import { createDatabasePrompt } from "./prompt";
import type { DatabasePrompt, DatabaseSelection } from "./types";

const camel = (name: string) =>
  name.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());

export function databaseOption(
  options: Record<string, unknown>,
  name: string,
): unknown {
  return options[name] ?? options[camel(name)];
}

function explicitFields(options: Record<string, unknown>) {
  return {
    host: databaseOption(options, "database-host") as string | undefined,
    port: databaseOption(options, "database-port") as number | undefined,
    user: databaseOption(options, "database-user") as string | undefined,
    password: databaseOption(options, "database-password") as
      string | undefined,
    database: databaseOption(options, "database-name") as string | undefined,
  };
}

export async function resolveDatabaseSelection(
  options: Record<string, unknown>,
  defaultDatabase: string,
  prompt: DatabasePrompt = createDatabasePrompt(),
  interactive = Boolean(process.stdin.isTTY),
): Promise<DatabaseSelection> {
  const requested = databaseOption(options, "database-setup");
  const suppliedUrl = databaseOption(options, "database-url") as
    string | undefined;
  const fields = explicitFields(options);
  const hasFields = Object.values(fields).some((value) => value !== undefined);
  let url = suppliedUrl
    ? validateDatabaseUrl(suppliedUrl)
    : buildDatabaseUrl(fields, defaultDatabase);
  if (requested === false) return { url, setup: false };
  if (suppliedUrl || hasFields) return { url, setup: true };
  if (!interactive) return { url, setup: requested === true };
  const enteredUrl = await prompt.secret(
    "Database URL (leave blank to enter host/user/password)",
  );
  if (enteredUrl) return { url: validateDatabaseUrl(enteredUrl), setup: true };
  url = buildDatabaseUrl(
    {
      host: await prompt.text("Database host", "localhost"),
      port: await prompt.text("Database port", "5432"),
      user: await prompt.text("Database user", "postgres"),
      password: await prompt.secret("Database password"),
      database: await prompt.text("Database name", defaultDatabase),
    },
    defaultDatabase,
  );
  return { url, setup: true };
}
