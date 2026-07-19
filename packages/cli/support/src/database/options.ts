import type { CommandOption } from "@damatjs/cli";

export const databaseSetupOptions: CommandOption[] = [
  {
    name: "database-url",
    type: "string",
    description:
      "Complete PostgreSQL URL (otherwise connection fields are prompted)",
  },
  {
    name: "database-host",
    type: "string",
    description: "PostgreSQL host (default: localhost)",
  },
  {
    name: "database-port",
    type: "number",
    description: "PostgreSQL port (default: 5432)",
  },
  {
    name: "database-user",
    type: "string",
    description: "PostgreSQL user (default: postgres)",
  },
  {
    name: "database-password",
    type: "string",
    description: "PostgreSQL password (prefer the hidden interactive prompt)",
  },
  {
    name: "database-name",
    type: "string",
    description:
      "PostgreSQL database name (default: derived from package name)",
  },
  {
    name: "database-setup",
    type: "boolean",
    default: true,
    description:
      "Create the database and migrate it (use --no-database-setup to defer)",
  },
];
